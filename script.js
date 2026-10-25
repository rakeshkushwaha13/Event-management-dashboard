"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const EVENTS_KEY = "eventflow_events_v2";
    const PARTICIPANTS_KEY = "eventflow_participants_v2";
    const THEME_KEY = "eventflow_theme";

    function loadData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Storage error:", error);
            return [];
        }
    }

    let events = loadData(EVENTS_KEY);
    let participants = loadData(PARTICIPANTS_KEY);

    function saveData() {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
        localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
    }

    function createId() {
        if (window.crypto && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        return Date.now().toString(36) +
            Math.random().toString(36).substring(2);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => {
            const characters = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return characters[char];
        });
    }

    function getToday() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(value) {
        if (!value) return "No date";

        const date = new Date(value + "T00:00:00");

        if (isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    let toastTimeout;

    function showToast(message) {
        const toast = $("toast");

        if (!toast) {
            console.log(message);
            return;
        }

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2500);
    }

    // ==============================
    // NAVIGATION
    // ==============================

    function switchPage(pageName) {
        document.querySelectorAll(".page").forEach((page) => {
            page.classList.add("hidden");
        });

        const selectedPage = $(pageName + "Page");

        if (selectedPage) {
            selectedPage.classList.remove("hidden");
        }

        document.querySelectorAll(".nav-btn").forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.page === pageName
            );
        });

        const titles = {
            dashboard: "Dashboard",
            events: "Events",
            participants: "Participants",
            analytics: "Analytics"
        };

        if ($("pageTitle")) {
            $("pageTitle").textContent =
                titles[pageName] || "Dashboard";
        }

        renderAll();
    }

    document.querySelectorAll(".nav-btn").forEach((button) => {
        button.addEventListener("click", () => {
            switchPage(button.dataset.page);
        });
    });

    // ==============================
    // EVENT MODAL
    // ==============================

    function openModal(id = "") {
        const form = $("eventForm");

        if (!form || !$("eventModal")) return;

        form.reset();
        $("eventId").value = "";
        $("modalTitle").textContent = "Create Event";

        if ($("eventDate")) {
            $("eventDate").min = getToday();
        }

        if (id) {
            const event = events.find((item) => item.id === id);

            if (!event) {
                showToast("Event not found!");
                return;
            }

            $("modalTitle").textContent = "Edit Event";
            $("eventId").value = event.id;
            $("eventName").value = event.name;
            $("eventCategory").value = event.category;
            $("eventDate").value = event.date;
            $("eventLocation").value = event.location;
            $("eventDescription").value = event.description || "";
        }

        $("eventModal").classList.remove("hidden");
    }

    function closeModal() {
        if ($("eventModal")) {
            $("eventModal").classList.add("hidden");
        }
    }

    $("addEventBtn")?.addEventListener("click", () => openModal());
    $("addEventBtn2")?.addEventListener("click", () => openModal());

    $("closeModal")?.addEventListener("click", closeModal);
    $("cancelModal")?.addEventListener("click", closeModal);

    $("eventModal")?.addEventListener("click", (event) => {
        if (event.target === $("eventModal")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    });

    // ==============================
    // CREATE AND UPDATE EVENTS
    // ==============================

    $("eventForm")?.addEventListener("submit", (event) => {
        event.preventDefault();

        const id = $("eventId").value;
        const name = $("eventName").value.trim();
        const category = $("eventCategory").value;
        const date = $("eventDate").value;
        const location = $("eventLocation").value.trim();
        const description = $("eventDescription").value.trim();

        if (!name || !category || !date || !location) {
            showToast("Please fill all required fields!");
            return;
        }

        if (date < getToday()) {
            showToast("Please select today or a future date!");
            return;
        }

        if (id) {
            const index = events.findIndex((item) => item.id === id);

            if (index === -1) {
                showToast("Event not found!");
                return;
            }

            events[index] = {
                ...events[index],
                name,
                category,
                date,
                location,
                description
            };

            showToast("Event updated successfully!");
        } else {
            events.push({
                id: createId(),
                name,
                category,
                date,
                location,
                description
            });

            showToast("Event created successfully!");
        }

        saveData();
        closeModal();
        renderAll();
    });

    // ==============================
    // EVENT CARDS
    // ==============================

    function createEventCard(event) {
        const total = participants.filter(
            (person) => person.eventId === event.id
        ).length;

        return `
            <div class="event-card">
                <span class="badge">
                    ${escapeHTML(event.category)}
                </span>

                <h3>${escapeHTML(event.name)}</h3>

                <p>📅 ${escapeHTML(formatDate(event.date))}</p>

                <p>📍 ${escapeHTML(event.location)}</p>

                <p>👥 ${total} Participants</p>

                <p>${escapeHTML(event.description || "")}</p>

                <div class="card-actions">
                    <button
                        type="button"
                        data-action="edit"
                        data-id="${escapeHTML(event.id)}">
                        ✏️ Edit
                    </button>

                    <button
                        type="button"
                        class="delete-btn"
                        data-action="delete"
                        data-id="${escapeHTML(event.id)}">
                        🗑 Delete
                    </button>
                </div>
            </div>
        `;
    }

    function renderEvents() {
        const search = ($("searchInput")?.value || "")
            .trim()
            .toLowerCase();

        const category = $("categoryFilter")?.value || "All";

        const filteredEvents = events.filter((event) => {
            const matchesSearch =
                event.name.toLowerCase().includes(search) ||
                event.location.toLowerCase().includes(search) ||
                event.category.toLowerCase().includes(search);

            const matchesCategory =
                category === "All" || event.category === category;

            return matchesSearch && matchesCategory;
        });

        if ($("allEvents")) {
            $("allEvents").innerHTML = filteredEvents.length
                ? filteredEvents.map(createEventCard).join("")
                : `<div class="empty-state">
                    No events found. Create your first event!
                   </div>`;
        }

        if ($("dashboardEvents")) {
            const recentEvents = [...events]
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 4);

            $("dashboardEvents").innerHTML = recentEvents.length
                ? recentEvents.map(createEventCard).join("")
                : `<div class="empty-state">
                    No events available. Create an event!
                   </div>`;
        }
    }

    // ==============================
    // DELETE EVENTS
    // ==============================

    function deleteEvent(id) {
        const event = events.find((item) => item.id === id);

        if (!event) return;

        const confirmed = confirm(
            `Are you sure you want to delete "${event.name}"?`
        );

        if (!confirmed) return;

        events = events.filter((item) => item.id !== id);

        participants = participants.filter(
            (person) => person.eventId !== id
        );

        saveData();
        renderAll();

        showToast("Event deleted successfully!");
    }

    // ==============================
    // EVENT BUTTON ACTIONS
    // ==============================

    function handleActions(event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "edit") {
            openModal(id);
        }

        if (action === "delete") {
            deleteEvent(id);
        }

        if (action === "remove-participant") {
            const confirmed = confirm(
                "Are you sure you want to remove this participant?"
            );

            if (!confirmed) return;

            participants = participants.filter(
                (person) => person.id !== id
            );

            saveData();
            renderAll();

            showToast("Participant removed successfully!");
        }
    }

    $("allEvents")?.addEventListener("click", handleActions);

    $("dashboardEvents")?.addEventListener(
        "click",
        handleActions
    );

    $("participantTable")?.addEventListener(
        "click",
        handleActions
    );

    // ==============================
    // SEARCH AND FILTER
    // ==============================

    $("searchInput")?.addEventListener("input", renderEvents);

    $("categoryFilter")?.addEventListener(
        "change",
        renderEvents
    );

    // ==============================
    // PARTICIPANT REGISTRATION
    // ==============================

    function renderParticipantOptions() {
        const select = $("participantEvent");

        if (!select) return;

        const selectedValue = select.value;

        if (events.length === 0) {
            select.innerHTML = `
                <option value="">Create an event first</option>
            `;

            select.disabled = true;
            return;
        }

        select.disabled = false;

        select.innerHTML = `
            <option value="">Select an event</option>
            ${events.map((event) => `
                <option value="${escapeHTML(event.id)}">
                    ${escapeHTML(event.name)}
                </option>
            `).join("")}
        `;

        if (events.some((event) => event.id === selectedValue)) {
            select.value = selectedValue;
        }
    }

    $("participantForm")?.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = $("participantName").value.trim();
        const email = $("participantEmail").value.trim();
        const eventId = $("participantEvent").value;

        if (!name || !email || !eventId) {
            showToast("Please complete all fields!");
            return;
        }

        const selectedEvent = events.find(
            (item) => item.id === eventId
        );

        if (!selectedEvent) {
            showToast("Please select a valid event!");
            return;
        }

        const alreadyRegistered = participants.some(
            (person) =>
                person.email.toLowerCase() === email.toLowerCase() &&
                person.eventId === eventId
        );

        if (alreadyRegistered) {
            showToast("This email is already registered!");
            return;
        }

        participants.push({
            id: createId(),
            name,
            email,
            eventId
        });

        saveData();

        event.target.reset();

        renderAll();

        showToast("Registration successful!");
    });

    // ==============================
    // PARTICIPANTS TABLE
    // ==============================

    function getEventName(id) {
        const event = events.find((item) => item.id === id);

        return event ? event.name : "Unknown Event";
    }

    function renderParticipants() {
        const table = $("participantTable");

        if (!table) return;

        if (participants.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="4">
                        No participants registered yet.
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML = participants.map((person) => `
            <tr>
                <td>${escapeHTML(person.name)}</td>

                <td>${escapeHTML(person.email)}</td>

                <td>
                    ${escapeHTML(getEventName(person.eventId))}
                </td>

                <td>
                    <button
                        type="button"
                        class="table-action"
                        data-action="remove-participant"
                        data-id="${escapeHTML(person.id)}">
                        Remove
                    </button>
                </td>
            </tr>
        `).join("");
    }

    // ==============================
    // DASHBOARD STATISTICS
    // ==============================

    function renderStats() {
        const today = getToday();

        const upcoming = events.filter(
            (event) => event.date >= today
        ).length;

        if ($("totalEvents")) {
            $("totalEvents").textContent = events.length;
        }

        if ($("upcomingEvents")) {
            $("upcomingEvents").textContent = upcoming;
        }

        if ($("totalParticipants")) {
            $("totalParticipants").textContent = participants.length;
        }

        if ($("registrationCount")) {
            $("registrationCount").textContent = participants.length;
        }

        if ($("categoryCount")) {
            const categories = new Set(
                events.map((event) => event.category)
            );

            $("categoryCount").textContent = categories.size;
        }
    }

    // ==============================
    // ANALYTICS
    // ==============================

    function renderAnalytics() {
        const container = $("categoryAnalytics");

        if (!container) return;

        const counts = {};

        events.forEach((event) => {
            counts[event.category] =
                (counts[event.category] || 0) + 1;
        });

        const categories = Object.entries(counts);

        if (categories.length === 0) {
            container.innerHTML = `
                <p class="muted">
                    No analytics available. Create events first.
                </p>
            `;

            return;
        }

        const maximum = Math.max(
            ...categories.map((item) => item[1])
        );

        container.innerHTML = categories.map(
            ([category, count]) => {
                const percentage = (count / maximum) * 100;

                return `
                    <div class="analytics-row">
                        <div class="analytics-label">
                            <span>${escapeHTML(category)}</span>
                            <strong>${count}</strong>
                        </div>

                        <div class="progress">
                            <div style="width:${percentage}%"></div>
                        </div>
                    </div>
                `;
            }
        ).join("");
    }

    // ==============================
    // EXPORT PARTICIPANTS CSV
    // ==============================

    function exportCSV() {
        if (participants.length === 0) {
            showToast("No participants to export!");
            return;
        }

        const rows = [
            ["Name", "Email", "Event"]
        ];

        participants.forEach((person) => {
            rows.push([
                person.name,
                person.email,
                getEventName(person.eventId)
            ]);
        });

        const csvContent = rows.map((row) => {
            return row.map((value) => {
                // Keep spreadsheet software from interpreting
                // participant-provided text as formulas.
                let safeValue = String(value ?? "");

                if (/^[\s]*[=+\-@\t\r]/.test(safeValue)) {
                    safeValue = "'" + safeValue;
                }

                return `"${safeValue.replace(/"/g, '""')}"`;
            }).join(",");
        }).join("\r\n");

        const blob = new Blob(
            ["\uFEFF" + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "event-participants.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        showToast("CSV exported successfully!");
    }

    $("exportBtn")?.addEventListener("click", exportCSV);

    // ==============================
    // DARK MODE
    // ==============================

    function updateThemeButton() {
        const isDark = document.body.classList.contains("dark");

        if ($("themeBtn")) {
            $("themeBtn").textContent = isDark
                ? "☀️ Light Mode"
                : "🌙 Dark Mode";
        }
    }

    if (localStorage.getItem(THEME_KEY) === "dark") {
        document.body.classList.add("dark");
    }

    updateThemeButton();

    $("themeBtn")?.addEventListener("click", () => {
        document.body.classList.toggle("dark");

        const isDark = document.body.classList.contains("dark");

        localStorage.setItem(
            THEME_KEY,
            isDark ? "dark" : "light"
        );

        updateThemeButton();
    });

    // ==============================
    // RENDER ALL
    // ==============================

    function renderAll() {
        renderStats();
        renderEvents();
        renderParticipantOptions();
        renderParticipants();
        renderAnalytics();
    }

    // ==============================
    // INITIALIZE APPLICATION
    // ==============================

    if ($("eventDate")) {
        $("eventDate").min = getToday();
    }

    renderAll();

    console.log("EventFlow Dashboard initialized successfully!");
});