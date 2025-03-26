/**
 * Main JavaScript file for EMS Skills Tracker
 * Contains common client-side functionality used across the application
 */

// Display notification to the user
function showNotification(message, type = 'info') {
  // Check if notification container exists, create if not
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '1000';
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="message">${message}</span>
    <button class="close-btn">&times;</button>
  `;
  
  // Style the notification
  notification.style.backgroundColor = type === 'error' ? '#ffebee' : 
                                      type === 'success' ? '#e8f5e9' : '#e3f2fd';
  notification.style.color = type === 'error' ? '#c62828' : 
                            type === 'success' ? '#2e7d32' : '#1565c0';
  notification.style.padding = '12px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
  notification.style.display = 'flex';
  notification.style.justifyContent = 'space-between';
  notification.style.alignItems = 'center';
  
  // Style close button
  const closeBtn = notification.querySelector('.close-btn');
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.marginLeft = '10px';
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Auto remove after 5 seconds
  const timeout = setTimeout(() => {
    notification.remove();
  }, 5000);
  
  // Remove on click
  closeBtn.addEventListener('click', () => {
    clearTimeout(timeout);
    notification.remove();
  });
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Handle API errors
function handleApiError(error) {
  console.error('API Error:', error);
  
  let errorMessage = 'An unexpected error occurred. Please try again.';
  
  if (error.response) {
    // Server responded with an error status
    if (error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error;
    } else {
      errorMessage = `Server error: ${error.response.status}`;
    }
  } else if (error.request) {
    // Request was made but no response received
    errorMessage = 'No response from server. Please check your connection.';
  } else if (error.message) {
    // Something else went wrong
    errorMessage = error.message;
  }
  
  showNotification(errorMessage, 'error');
}

// Modal helper functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
});

// Logout function
function logout() {
  fetch('/api/auth/logout')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = '/login';
      }
    })
    .catch(error => {
      console.error('Logout error:', error);
      window.location.href = '/login'; // Redirect anyway
    });
}

// Add event listener to logout links
document.addEventListener('DOMContentLoaded', () => {
  const logoutLinks = document.querySelectorAll('.logout-link');
  logoutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });
});
