(async function loadNavbar() {
    try {
        const res = await fetch('/navbar.html');
        const html = await res.text();

        const container = document.getElementById('navbar-container');
        container.innerHTML = html;

        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            document.body.appendChild(newScript);
        });

        console.log('✅ Navbar inserted and script executed');
    } catch (err) {
        console.error('❌ Failed to load navbar:', err);
    }
})();
