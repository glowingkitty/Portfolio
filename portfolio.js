const previewDialog = document.querySelector(".preview-dialog");

if (previewDialog) {
  const title = previewDialog.querySelector("h2");

  for (const trigger of document.querySelectorAll("[data-preview]")) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      title.textContent = trigger.dataset.preview;
      previewDialog.showModal();
    });
  }
}
