from flask import Flask, request, jsonify
import pdfplumber
import re
import tempfile
from flask_cors import CORS
from flask import send_from_directory
import os

app = Flask(__name__)
CORS(app)

EXCLUDED_CODES = {"LN01_PE1", "NSTP1", "LN01_PE2", "NSTP2", "LN01_PE3", "LN01_PE4"}

def parse_grades(text):
    results = []
    lines = text.splitlines()

    for line in lines:
        if re.match(r'^\d\.\d{2}', line):
            match = re.match(
                r'^(\d\.\d{2})\s+'
                r'([A-Z0-9_ ]+)(?:/[A-Z0-9_ ]+)?\s+'
                r'(.+?)\s+'
                r'(\d\.\d{2})\s+'
                r'((?:\dS|SM|1S|2S) of \d{4})'
                r'(?:\s+([A-Z0-9_ /,]+))?'
                r'\s+(Passed|Failed)',
                line
            )
            if match:
                grade = match.group(1)
                code = match.group(2).strip()
                description = match.group(3).strip()
                units = match.group(4)
                term = match.group(5)
                prereq = match.group(6).strip() if match.group(6) else ""
                remarks = match.group(7)

                entry = [grade, "", code, description, units, term, prereq, remarks]
                results.append(entry)
    return results

def extract_from_pdf(file):
    all_text = ""
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            all_text += page.extract_text() + "\n"
    return all_text

def compute_gwa(parsed_data):
    total_weighted = 0.0
    total_units = 0.0
    subject_count = 0

    for row in parsed_data:
        grade = float(row[0])
        code = row[2]
        units = float(row[4])

        if code in EXCLUDED_CODES:
            continue

        total_weighted += grade * units
        total_units += units
        subject_count += 1

    if total_units == 0:
        return None

    gwa = total_weighted / total_units
    return round(gwa, 2), total_weighted, total_units, subject_count

def get_disqualifying_subjects(parsed_data):
    return [
        {
            "code": row[2],
            "description": row[3],
            "grade": float(row[0])
        }
        for row in parsed_data
        if float(row[0]) > 2.00 and row[2] not in EXCLUDED_CODES
    ]

def determine_honor_label(gwa, parsed_data):
    has_grade_below_2 = any(
        float(row[0]) > 2.00 and row[2] not in EXCLUDED_CODES
        for row in parsed_data
    )

    if gwa <= 1.25 and not has_grade_below_2:
        return "Summa Cum Laude"
    elif gwa <= 1.50 and not has_grade_below_2:
        return "Magna Cum Laude"
    elif gwa <= 1.75 and not has_grade_below_2:
        return "Cum Laude"
    elif gwa <= 1.75 and has_grade_below_2:
        return "With Academic Distinction"
    else:
        return "No Latin Honor"

def get_reason(honor, disqualified_subjects, gwa):
    if honor == "No Latin Honor":
        if disqualified_subjects:
            return "There is a grade below 2.00, which disqualifies Latin Honor eligibility."
        else:
            return "The GWA doesn't meet the Latin Honor threshold."
    elif honor == "With Academic Distinction":
        return "You meet the GWA requirement for Latin Honor, but grade(s) below 2.00 disqualify it."
    return None

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    pdf_file = request.files['file']
    if not pdf_file.filename.endswith('.pdf'):
        return jsonify({'error': 'Invalid file type'}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        pdf_file.save(tmp.name)
        text = extract_from_pdf(tmp.name)
        parsed = parse_grades(text)
        result = compute_gwa(parsed)

        if result:
            gwa, weighted, units, count = result
            disqualified_subjects = get_disqualifying_subjects(parsed)
            honor = determine_honor_label(gwa, parsed)
            reason = get_reason(honor, disqualified_subjects, gwa)

            return jsonify({
                'gwa': gwa,
                'total_units': units,
                'subject_count': count,
                'honor': honor,
                'reason': reason,
                'disqualified_subjects': disqualified_subjects
            })
        else:
            return jsonify({'error': 'No subjects found'}), 400
        
@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static_file(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True)
