import { ipcRenderer } from "electron";
import { UI } from "./ui";

export namespace Ident {
  export function initUI() : void {
    let filePath: string | undefined;
    let destinationPath: string;
    let fileLabel = document.getElementById("file-enc-path-label");
    let fileField = document.getElementById("encryption-key") as HTMLInputElement;
    let lot = document.getElementById("lot-number") as HTMLInputElement;
    let cardQuantity = document.getElementById("card-quantity") as HTMLInputElement;
    let startBtn = document.getElementById("start-btn") as HTMLInputElement;
    let destinationPathBtn = document.getElementById("destination-path") as HTMLInputElement;
    let destinationPathLabel = document.getElementById("show-destination-path") as HTMLElement;

    fileField!.addEventListener("change", (e) => {
      let target = e.target as HTMLInputElement;
      filePath = target?.files![0] ? target.files[0].path : undefined;
      fileLabel!.innerHTML = filePath ? filePath : "No file selected";
      filePath && lot.value && cardQuantity.value ? startBtn.removeAttribute("disabled") : startBtn.setAttribute("disabled", "disabled");
      e.preventDefault();
    });

    lot.addEventListener("input", (e) => {
      filePath && lot.value && cardQuantity.value ? startBtn.removeAttribute("disabled") : startBtn.setAttribute("disabled", "disabled");
      e.preventDefault();
    });

    cardQuantity.addEventListener("input", (e) => {
      filePath && lot.value && cardQuantity.value ? startBtn.removeAttribute("disabled") : startBtn.setAttribute("disabled", "disabled");
      e.preventDefault();
    });

    destinationPathBtn.addEventListener("click", (e) => {
      ipcRenderer.send("open-destination-folder-dialog");
    });

    ipcRenderer.on("verification-success", (_) => {
      ipcRenderer.send("start-ident", filePath, lot.value, cardQuantity.value, destinationPathLabel.innerHTML);

      lot.value = "";
      cardQuantity.value = "";
      fileLabel!.innerHTML = "No file selected";
      destinationPathLabel.innerHTML = "No destination file selected"

      UI.loadFragment("waiting.html", () => {
        document.getElementById("waiting-message")!.innerHTML = "Certificate generation in progress";
      });
    });
  }

  export function setDestinationPath(path: string) : void {
    let destinationPathLabel = document.getElementById("show-destination-path");
    destinationPathLabel!.innerHTML = path;
  }
}