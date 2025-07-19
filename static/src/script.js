document.addEventListener('DOMContentLoaded', function () {
    const startBtn = document.getElementById('start-calc-btn');
    const introSection = document.querySelector('.intro-section');
    const uploadSection = document.getElementById('calculator');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('fileUpload');
    const uploadedFile = document.getElementById('uploaded-file');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const fileNameDisplay = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');
    const continueBtn = document.getElementById('continue-btn');
    const uploadError = document.getElementById('upload-error');
    const resultSection = document.getElementById('result-section');
    const gwaResult = document.getElementById('gwa-result');


    // Show/hide sections based on hash
    function handleRouting() {
        const hash = location.hash;

        if (hash === '#calculator') {
            introSection.classList.add('d-none');
            uploadSection.classList.remove('d-none');
            document.getElementById('about')?.classList.add('d-none');
        } else if (hash === '#about') {
            introSection.classList.add('d-none');
            uploadSection.classList.add('d-none');
            document.getElementById('about')?.classList.remove('d-none');
        } else {
            // Home / default
            introSection.classList.remove('d-none');
            uploadSection.classList.add('d-none');
            document.getElementById('about')?.classList.add('d-none');
        }
    }

    // Handle routing on initial load
    handleRouting();

    // Handle routing when hash changes (e.g., nav click or manual URL)
    window.addEventListener('hashchange', handleRouting);

    // Handle "Calculate Now" button
    startBtn?.addEventListener('click', function () {
        location.hash = 'calculator';
        uploadSection.scrollIntoView({ behavior: 'smooth' });
    });

    continueBtn?.addEventListener('click', () => {
        if (!fileInput.files.length) {
            uploadError.classList.remove('d-none');
            return;
        }

        uploadError.classList.add('d-none');

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        gwaResult.innerHTML = `⏳ Calculating your GWA...`;
        resultSection.classList.remove('d-none');
        document.getElementById('calc-header')?.classList.add('d-none');
        dropZone.classList.add('d-none');
        uploadedFile.classList.add('d-none');
        uploadPlaceholder.classList.remove('d-none');

        // Step indicator
        document.querySelector('.step.active')?.classList.remove('active');
        document.querySelectorAll('.step')[1].classList.add('active');
        continueBtn.classList.add('d-none');

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    gwaResult.innerHTML = `<span class="rslt_err text-danger">${data.error === "No subjects found"
                        ? "⚠️ No grades were computed.<br>Please upload a valid PDF again."
                        : `❌ ${data.error}`
                        }</span>`;
                } else {
                    const { gwa, total_units, honor, reason } = data;

                    gwaResult.innerHTML =
                        honor !== "No Latin Honor"
                            ? `<span class="rslt_msg">You have a GWA of <strong>${gwa}</strong> with a total of <strong>${total_units}</strong> units.<br>
                       🎓 Congratulations!<br>Your Latin Honor Eligibility is: <strong>${honor}</strong>${reason ? `<br><span class="rslt_rsn">(${reason})</span>` : ""
                            }</span>`
                            : `<span class="rslt_msg">You have a GWA of <strong>${gwa}</strong> with a total of <strong>${total_units}</strong> units.<br>
                       😔 Sorry, your GWA is not eligible for any Latin honors.<br>
                       <em class="text-muted">Reason: ${reason || "N/A"}</em></span>`;
                }
            })
            .catch(err => {
                gwaResult.innerHTML = `<span class="text-danger">Unexpected error: ${err.message}</span>`;
            });
    });


    // Handle drag events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            showFile(file);
        }
    });

    // Clicking dropZone opens file dialog
    dropZone.addEventListener('click', () => fileInput.click());

    // Handle file selected via input
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file && file.type === 'application/pdf') {
            showFile(file);
        }
    });

    // Show file name and hide placeholder
    function showFile(file) {
        fileNameDisplay.textContent = file.name;
        uploadedFile.classList.remove('d-none');
        uploadPlaceholder.classList.add('d-none');
        uploadError.classList.add('d-none'); // Hide error on valid file
    }

    // Remove uploaded file
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering dropZone click
        fileInput.value = '';
        uploadedFile.classList.add('d-none');
        uploadPlaceholder.classList.remove('d-none');
    });

    document.getElementById('reupload-btn')?.addEventListener('click', () => {
        resultSection.classList.add('d-none');
        dropZone.classList.remove('d-none');

        // Reset step indicator
        document.querySelector('.step.active')?.classList.remove('active');
        document.querySelectorAll('.step')[0].classList.add('active');

        // Clear file input and file UI
        fileInput.value = '';
        document.getElementById('calc-header')?.classList.remove('d-none');
        uploadedFile.classList.add('d-none');
        uploadPlaceholder.classList.remove('d-none');

        // Show the continue button again
        continueBtn.classList.remove('d-none');
    });

    const toggleSampleBtn = document.getElementById('toggle-sample-btn');
    const sampleImage = document.getElementById('sample-pdf-image');

    toggleSampleBtn?.addEventListener('click', () => {
        sampleImage.classList.toggle('d-none');
        toggleSampleBtn.textContent = sampleImage.classList.contains('d-none') ? 'View Sample PDF' : 'Hide Sample PDF';
    });

});


