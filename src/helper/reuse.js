import Swal from "sweetalert2";

import upgradeIcon from "../assets/upgrade.png"; // adjust path to match your project

export function showUpgradePopup({
  price = "₹5000 / Year",
  titleIs = "Upgrade",
  features = [
    "Add unlimited members",
    "Access inactive clients",
    "Unlimited Leads",
    "Unlimited Direct WhatsApp",
    "Unlimited Direct Calls",
    "Premium customer support"
  ],
  whatsappNumber = "918148602102"
}) {
       const storedGym = localStorage.getItem("selectedGym");
        const gym = JSON.parse(storedGym);
  Swal.fire({
    title: titleIs,
    
    html: `
<div style="display: flex; flex-direction: column; align-items: center;">
  <p class="text-2xl font-semibold" style="color:#e71111ff; margin-bottom: 8px; text-align: center;">
    ₹5000 / Year
  </p>

  <p class="text-base font-semibold" style="color:#ff8800; margin-bottom: 14px; text-align: center; max-width: 320px;">
    🚀 Special Launch Price – Available Only for the First <span style="color:#e71111ff; font-weight: 700;">100 Gyms</span>.  
    Lock this unbeatable rate <span style="color:#16a34a; font-weight: 700;">forever!</span>
  </p>

  <ul style="list-style: none; padding: 0; margin: 0; color: #555; font-size: 15px; line-height: 1.6; text-align: left;">
    ${features.map(f => `<li>✅ ${f}</li>`).join("")}
  </ul>
</div>
    `,
    imageUrl: upgradeIcon,
    imageWidth: 80,
    imageHeight: 80,
    imageAlt: 'Upgrade Icon',
    showCancelButton: true,
    confirmButtonText: 'Upgrade Now',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#e71111ff',
    cancelButtonColor: 'rgba(155, 155, 155, 1)',
    backdrop: true,
    reverseButtons: true
  }).then((result) => {
    if (result.isConfirmed) {
      const message = `Hi from ${gym.GymName}, Gym id = ${gym.GymId}, I would like to upgrade.`;
      const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappURL, "_blank");
    }
  });
}