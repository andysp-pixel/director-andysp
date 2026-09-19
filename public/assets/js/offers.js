const offerForm = document.querySelector('#offer-booking-form');
const offerName = document.querySelector('#selected-offer-name');
const offerPrice = document.querySelector('#selected-offer-price');
const bookingStatus = document.querySelector('#booking-status');
const bookingWhatsApp = document.querySelector('#booking-whatsapp');
const whatsappNumber = '971588118994';

function whatsappUrl(service, details = '') {
  const message = [`Hi Director Andy SP, I would like to book: ${service}.`, details].filter(Boolean).join('\n');
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function selectOffer(key, name, price, scroll = true) {
  offerForm.elements.offer_key.value = key;
  offerName.textContent = name;
  offerPrice.textContent = price;
  offerForm.dataset.offer = name;
  offerForm.dataset.price = price;
  bookingWhatsApp.href = whatsappUrl(`${name} (${price})`);
  if (scroll) document.querySelector('#offer-booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('.offer-book-button').forEach(button => {
  button.addEventListener('click', () => selectOffer(button.dataset.offerKey || 'custom', button.dataset.offer || 'Custom project', button.dataset.price || 'Custom quote'));
});

document.querySelectorAll('[data-whatsapp-offer]').forEach(link => {
  link.href = whatsappUrl(link.dataset.whatsappOffer);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
});

offerForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = offerForm.querySelector('[type="submit"]');
  const data = Object.fromEntries(new FormData(offerForm));
  data.offer_name = offerForm.dataset.offer || offerName.textContent;
  data.price = offerForm.dataset.price || offerPrice.textContent;
  submit.disabled = true;
  submit.textContent = 'Sending booking…';
  bookingStatus.textContent = '';
  bookingStatus.className = 'booking-status';
  try {
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Booking could not be sent.');
    bookingStatus.textContent = result.email_sent ? 'Booking sent successfully. Your PDF is downloading.' : 'Booking saved successfully. Your PDF is downloading.';
    bookingStatus.classList.add('success');
    const download = document.createElement('a');
    download.href = result.pdf_url;
    download.download = '';
    document.body.appendChild(download);
    download.click();
    download.remove();
    bookingWhatsApp.href = whatsappUrl(`${data.offer_name} (${data.price})`, `Name: ${data.client_name}\nBooking reference: ${result.booking_id}`);
    offerForm.reset();
    offerForm.elements.offer_key.value = data.offer_key;
  } catch (error) {
    bookingStatus.textContent = `${error.message} You can still send the same request on WhatsApp.`;
    bookingStatus.classList.add('error');
    bookingWhatsApp.href = whatsappUrl(`${data.offer_name} (${data.price})`, `Name: ${data.client_name || '-'}\nEmail: ${data.client_email || '-'}\nPhone: ${data.phone || '-'}\nNotes: ${data.notes || '-'}`);
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Send booking &amp; get PDF <span>↗</span>';
  }
});

selectOffer('custom', 'Custom music project', 'Custom quote', false);
