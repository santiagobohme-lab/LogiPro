
const url = 'https://script.google.com/macros/s/AKfycbxrMmFzWDWGTNBxriKIlltgKh1HKKgLJpsLso6fOgcHoUUeBfZLnQaN4EFAQSGrIxc_/exec';
fetch(url, { method: 'POST', body: JSON.stringify({ action: 'login', nombre: 'admin.sistem', pass: 'admin123' }) })
  .then(r => r.json())
  .then(res => {
    console.log('Login:', res.status);
    const token = res.token;
    return fetch(url, { method: 'POST', body: JSON.stringify({ action: 'getTradingDashboard', token: token }) });
  })
  .then(r => r.json())
  .then(res => console.log('Dashboard:', res))
  .catch(console.error);

