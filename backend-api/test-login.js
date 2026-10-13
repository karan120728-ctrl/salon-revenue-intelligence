

async function test() {
    try {
        const res = await fetch('http://localhost:3001/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@marlowe.com', password: 'admin123' })
        });
        const text = await res.text();
        console.log(`STATUS: ${res.status}`);
        console.log(`BODY: ${text}`);
    } catch (e) {
        console.error(e);
    }
}
test();
