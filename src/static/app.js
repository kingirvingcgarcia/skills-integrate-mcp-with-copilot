document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherLoginButton = document.getElementById("teacher-login-button");
  const teacherLogoutButton = document.getElementById("teacher-logout-button");
  const teacherStatus = document.getElementById("teacher-status");
  const teacherNotice = document.getElementById("teacher-notice");
  const teacherLoginDialog = document.getElementById("teacher-login-dialog");
  const teacherLoginForm = document.getElementById("teacher-login-form");
  const teacherLoginError = document.getElementById("teacher-login-error");
  const teacherLoginCancel = document.getElementById("teacher-login-cancel");
  let accessToken = null;

  function updateTeacherControls() {
    const isTeacher = Boolean(accessToken);
    teacherLoginButton.hidden = isTeacher;
    teacherLogoutButton.hidden = !isTeacher;
    teacherStatus.hidden = !isTeacher;
    teacherStatus.textContent = isTeacher ? "Teacher mode" : "";
    signupForm.hidden = !isTeacher;
    teacherNotice.hidden = isTeacher;
  }

  function showMessage(text, className) {
    messageDiv.textContent = text;
    messageDiv.className = className;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  function handleExpiredSession() {
    accessToken = null;
    updateTeacherControls();
    if (!teacherLoginDialog.open) {
      teacherLoginDialog.showModal();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.length = 1;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        accessToken
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" aria-label="Unregister ${email}" title="Unregister student">&times;</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else if (response.status === 401) {
        handleExpiredSession();
        showMessage("Please sign in again to manage registrations.", "error");
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else if (response.status === 401) {
        handleExpiredSession();
        showMessage("Please sign in again to manage registrations.", "error");
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  teacherLoginButton.addEventListener("click", () => {
    teacherLoginError.textContent = "";
    teacherLoginError.classList.add("hidden");
    teacherLoginDialog.showModal();
  });

  teacherLoginCancel.addEventListener("click", () => teacherLoginDialog.close());

  teacherLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    teacherLoginError.textContent = "";
    teacherLoginError.classList.add("hidden");

    const formData = new FormData(teacherLoginForm);
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        teacherLoginError.textContent = result.detail || "Sign-in failed";
        teacherLoginError.classList.remove("hidden");
        return;
      }

      accessToken = result.access_token;
      teacherLoginForm.reset();
      teacherLoginDialog.close();
      updateTeacherControls();
      fetchActivities();
    } catch (error) {
      teacherLoginError.textContent = "Unable to sign in. Please try again.";
      teacherLoginError.classList.remove("hidden");
      console.error("Error signing in:", error);
    }
  });

  teacherLogoutButton.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } finally {
      accessToken = null;
      updateTeacherControls();
      fetchActivities();
    }
  });

  // Initialize app
  updateTeacherControls();
  fetchActivities();
});
