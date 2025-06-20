// Main JavaScript file for HotspotKenya

// Document ready function
$(document).ready(function() {
    // Initialize tooltips
    $('[data-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-toggle="popover"]').popover();
    
    // Payment status check
    if ($('#payment-status-container').length) {
        checkPaymentStatus();
    }
    
    // Package image preview
    $('#package-image').change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#image-preview').attr('src', e.target.result);
                $('#image-preview-container').removeClass('d-none');
            }
            reader.readAsDataURL(file);
        }
    });
    
    // Phone number validation for M-Pesa
    $('#mpesa-form').submit(function(e) {
        const phoneNumber = $('#phone-number').val();
        const phoneRegex = /^254\d{9}$/;
        
        if (!phoneRegex.test(phoneNumber)) {
            e.preventDefault();
            $('#phone-error').removeClass('d-none');
            return false;
        }
        
        $('#phone-error').addClass('d-none');
        return true;
    });
    
    // Date range picker for reports
    if ($('#date-range').length) {
        $('#date-range').daterangepicker({
            opens: 'left',
            maxDate: new Date(),
            locale: {
                format: 'YYYY-MM-DD'
            }
        });
    }
    
    // Data tables initialization
    if ($('.data-table').length) {
        $('.data-table').DataTable({
            responsive: true
        });
    }
});

// Function to check payment status
function checkPaymentStatus() {
    const statusContainer = $('#payment-status');
    const spinnerContainer = $('#payment-spinner');
    
    // Poll the server every 5 seconds to check payment status
    const checkStatus = setInterval(function() {
        $.ajax({
            url: '/payments/check-status',
            method: 'GET',
            success: function(response) {
                if (response.success) {
                    if (response.status === 'completed') {
                        clearInterval(checkStatus);
                        spinnerContainer.addClass('d-none');
                        statusContainer.html(`
                            <div class="alert alert-success">
                                <h4 class="alert-heading">Payment Successful!</h4>
                                <p>Your payment has been processed successfully. Your package is now active.</p>
                                <hr>
                                <p class="mb-0">
                                    <a href="/users/active-package" class="btn btn-primary">View My Package</a>
                                </p>
                            </div>
                        `);
                    }
                } else {
                    clearInterval(checkStatus);
                    spinnerContainer.addClass('d-none');
                    statusContainer.html(`
                        <div class="alert alert-danger">
                            <h4 class="alert-heading">Payment Failed!</h4>
                            <p>There was an error processing your payment. Please try again.</p>
                            <hr>
                            <p class="mb-0">
                                <a href="/packages" class="btn btn-primary">View Packages</a>
                            </p>
                        </div>
                    `);
                }
            },
            error: function() {
                clearInterval(checkStatus);
                spinnerContainer.addClass('d-none');
                statusContainer.html(`
                    <div class="alert alert-danger">
                        <h4 class="alert-heading">Error!</h4>
                        <p>There was an error checking your payment status. Please contact support.</p>
                        <hr>
                        <p class="mb-0">
                            <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
                        </p>
                    </div>
                `);
            }
        });
    }, 5000);
}

// Function to confirm deletion
function confirmDelete(formId, itemName) {
    if (confirm(`Are you sure you want to delete this ${itemName}? This action cannot be undone.`)) {
        document.getElementById(formId).submit();
    }
    return false;
}
