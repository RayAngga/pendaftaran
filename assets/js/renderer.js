import { buildTicketImage } from "./renderer.js";

const url = await buildTicketImage(rec);
const wrap = document.getElementById("ticket-wrap");
wrap.classList.remove("hidden");
wrap.innerHTML = `<img id="ticket-img" alt="ticket" class="rounded-2xl shadow-2xl ring-1 ring-white/10 block mx-auto" />`;
document.getElementById("ticket-img").src = url;

// Unduh
document.getElementById("t-download").onclick = () => {
  const a = document.createElement("a");
  a.href = url;
  a.download = `${rec.code || "ticket"}.png`;
  a.click();
};
