export const getWhatsAppLink = (phone: string, message: string) => {
  // Remove any non-numeric characters from the phone number
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

export const openWhatsApp = (phone: string, message: string) => {
  window.open(getWhatsAppLink(phone, message), "_blank");
};
