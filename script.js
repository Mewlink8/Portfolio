function toggleDropdown(event, id) {
    event.preventDefault();
    const dropdown = document.getElementById(id);
    dropdown.classList.toggle('show');

    // Mettre à jour l'URL avec le hash correspondant
    const hash = event.target.getAttribute('href');
    if (hash) {
        window.location.hash = hash;
    }
}

function showSection(event, sectionId) {
    event.preventDefault();

    // Masquer toutes les sections
    document.querySelectorAll('.content').forEach(section => {
        section.classList.add('hidden');
    });

    // Afficher la section sélectionnée
    const selectedSection = document.getElementById(sectionId);
    selectedSection.classList.remove('hidden');

    // Mettre à jour l'URL avec le hash
    window.location.hash = sectionId;
}

// Vérifier l'URL au chargement de la page
window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        showSection({ preventDefault: () => {} }, hash);
    } else {
        // Si pas de hash, afficher la section d'accueil
        document.getElementById('home').classList.remove('hidden');
    }
});