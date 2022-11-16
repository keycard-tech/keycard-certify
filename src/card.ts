import Keycard from "keycard-sdk"
import { WebContents } from "electron";
import { ipcMain, dialog } from "electron"
import { SessionInfo } from "./session-info";
import { Utils } from "./utils";
import { Pairing } from "keycard-sdk/dist/pairing";
import { Commandset } from "keycard-sdk/dist/commandset";
import { KeyPath } from "keycard-sdk/dist/key-path";
import { CardChannel } from "keycard-sdk/dist/card-channel";
import { BIP32KeyPair } from "keycard-sdk/dist/bip32key";
import { Certificate } from "keycard-sdk/dist/certificate";
import { CryptoUtils } from "keycard-sdk/dist/crypto-utils";

const pcsclite = require("@pokusew/pcsclite");
const Store = require('electron-store');
const fs = require("fs");
const openpgp = require('openpgp');
const path = require('path');

const maxPINRetryCount = 3;
const maxPUKRetryCount = 5;
const maxPairing = 5;
const dataHeader = "80e2000082";

export class Card {
  window: WebContents;
  channel?: CardChannel;
  cmdSet?: Commandset;
  sessionInfo: SessionInfo;
  pairingStore: any;

  constructor(window: WebContents) {
    this.window = window;
    this.pairingStore = new Store();
    this.sessionInfo = new SessionInfo();
    this.installEventHandlers();
  }

  savePairing(instanceUID: Uint8Array, pairing: string): void {
    this.pairingStore.set(Utils.hx(instanceUID), pairing);
  }

  loadPairing(instanceUID: Uint8Array): string {
    return this.pairingStore.get(Utils.hx(instanceUID));
  }

  isPaired(instanceUID: Uint8Array): boolean {
    return this.pairingStore.has(Utils.hx(instanceUID));
  }

  deletePairing(instanceUID: Uint8Array): void {
    this.pairingStore.delete(Utils.hx(instanceUID));
  }

  async connectCard(reader: any, protocol: number): Promise<void> {
    try {
      this.channel = new Keycard.PCSCCardChannel(reader, protocol);
      this.cmdSet = new Keycard.Commandset(this.channel);
      this.window.send('card-connected');
    } catch (err: any) {
      if (err.sw == 0x6a82) {
        this.window.send("card-exceptions", "Error: Keycard Applet not installed");
      } else {
        this.window.send("card-exceptions", err.message);
      }
    }
  }

  async openSecureChannel(): Promise<void> {
    (await this.cmdSet!.select()).checkOK();
    this.sessionInfo.secureChannelOpened = false;

    while (!this.sessionInfo.secureChannelOpened) {
      try {
        if (!(await this.pairCard())) {
          return;
        }
      } catch (err) {
        continue;
      }

      try {
        await this.cmdSet!.autoOpenSecureChannel();
        this.window.send("secure-channel");
        this.sessionInfo.secureChannelOpened = true;
      } catch (err) {
        this.deletePairing(this.cmdSet!.applicationInfo.instanceUID);
      }
    }

    await this.displayData();
    this.window.send("secure-channel-opened");
    this.window.send("disable-open-secure-channel");
  }

  pairCard(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let pairingInfo: string;
      let instanceUID = this.cmdSet!.applicationInfo.instanceUID;


      if (this.isPaired(instanceUID)) {
        pairingInfo = this.loadPairing(instanceUID);
        this.cmdSet!.setPairing(Pairing.fromString(pairingInfo));
        this.window.send("pairing-found");
        resolve(true);
      } else {
        this.window.send("pairing-needed");
        ipcMain.once("pairing-pass-submitted", async (_, pairingPassword: string) => {
          if (pairingPassword) {
            try {
              await this.cmdSet!.autoPair(pairingPassword);
            } catch {
              reject("Error: invalid password");
              return;
            }
            (await this.cmdSet!.select()).checkOK();
            this.savePairing(this.cmdSet!.applicationInfo.instanceUID, this.cmdSet!.getPairing().toBase64());
            this.window.send("paired");
            resolve(true);
          } else {
            resolve(false);
          }
        });
      }
    });
  }

  async displayData(): Promise<void> {
    let status = new Keycard.ApplicationStatus((await this.cmdSet!.getStatus(Keycard.Constants.GET_STATUS_P1_APPLICATION)).checkOK().data);
    let path = new KeyPath((await this.cmdSet!.getStatus(Keycard.Constants.GET_STATUS_P1_KEY_PATH)).checkOK().data);
    this.sessionInfo.keyPath = path.toString();
    this.sessionInfo.setApplicationInfo(this.cmdSet!.applicationInfo);
    this.sessionInfo.setApplicationStatus(status);
    this.window.send('application-info', this.sessionInfo);
    this.window.send("enable-pin-verification");
  }

  async verifyPIN(pin: string): Promise<void> {
    try {
      (await this.cmdSet!.verifyPIN(pin)).checkAuthOK();
      this.sessionInfo.pinRetry = maxPINRetryCount;
      this.sessionInfo.pinVerified = true;
      this.window.send('application-info', this.sessionInfo);
      this.window.send("pin-verified");
      this.window.send("verification-success");
    } catch (err: any) {
      if (err.retryAttempts != undefined) {
        this.sessionInfo.pinRetry = err.retryAttempts;
        this.window.send('application-info', this.sessionInfo);

        if (err.retryAttempts > 0) {
          this.window.send("pin-screen-needed");
        } else {
          this.window.send("puk-screen-needed");
          this.window.send("pin-verification-failed", err.message);
        }
      } else {
        throw err;
      }
    }
  }

  async verifyPUK(puk: string, newPin: string): Promise<void> {
    try {
      (await this.cmdSet!.unblockPIN(puk, newPin)).checkOK();
      this.sessionInfo.pinRetry = maxPINRetryCount;
      this.sessionInfo.pukRetry = maxPUKRetryCount;
      this.sessionInfo.pinVerified = true;
      this.window.send('application-info', this.sessionInfo);
      this.window.send("puk-verified");
      this.window.send("pin-verified");
      this.window.send("verification-success");
    } catch (err) {
      this.sessionInfo.pukRetry = (typeof this.sessionInfo.pukRetry == "number") ? (this.sessionInfo.pukRetry--) : this.sessionInfo.pukRetry;
      this.window.send('application-info', this.sessionInfo);
      if (this.sessionInfo.pukRetry > 0) {
        this.window.send("puk-screen-needed");
      } else {
        this.window.send("unblock-pin-failed");
      }
    }
  }

  async identCert(gpgKey: string, lot: string, cardQuantity: string, destPath: string): Promise<void> {
    let cards = parseInt(cardQuantity);
    let data = (await this.cmdSet!.exportKey(1, false, "m/43'/60'/1581'/2'/0")).checkOK().data;
    let caKey = BIP32KeyPair.fromTLV(data);
    let encKey = fs.readFileSync(gpgKey, { encoding: 'utf8', flag: 'r' });
    let encData = "";

    this.window.send("pub-key", Buffer.from(CryptoUtils.compressPublicKey(caKey.publicKey)).toString('hex'));

    for (let i = 0; i < cards; i++) {
      let certificate = Certificate.generateNewCertificate(caKey);
      let certData = certificate.toStoreData();
      let num = Utils.formatNumtoString(i);
      let cardID = lot + num;
      let certDataString = dataHeader + Buffer.from(certData).toString('hex');
      let line = cardID + "," + certDataString + "\n";
      encData += line;
    }

    let encryptedData = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: encData }),
      encryptionKeys: await openpgp.readKey({ armoredKey: encKey }),
    });

    fs.writeFileSync(destPath, encryptedData);

    this.window.send("certificate-creation-success");
  }

  openDestinationDialog() : void {
    let options = {
      title: 'Select the destination path to save the processed file',
      buttonLabel: "Choose",
      defaultPath: path.join(__dirname, 'certificates.csv.asc'),
      filters: [
        {
            name: 'ASC Files',
            extensions: ['csv.asc']
        }
      ]
    };

    dialog.showSaveDialog(options).then((path) => {
      this.window.send("destination-path-selected", path.filePath);
    }).catch((err) => {
      throw(err);
    });
  }

  resetConnection(): void {
    this.sessionInfo.reset();
    this.window.send("application-info", this.sessionInfo);
  }

  start(): void {
    let pcsc = pcsclite();
    let card = this;

    pcsc.on('reader', (reader: any) => {
      card.window.send('card-detected', reader.name);

      reader.on('error', function (err: Error) {
        card.window.send('card-detected', reader.name, err.message);
      });

      reader.on('status', (status: any) => {
        let changes = reader.state ^ status.state;

        if (!changes) {
          return;
        }

        if ((changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY)) {
          if (card.sessionInfo.cardConnected) {
            card.window.send('card-removed', reader.name);
            card.resetConnection();
            reader.disconnect(reader.SCARD_LEAVE_CARD, (_: Error) => { });
          }

        } else if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
          reader.connect({ share_mode: reader.SCARD_SHARE_EXCLUSIVE }, async function (err: Error, protocol: number) {
            card.sessionInfo.cardConnected = true;
            if (err) {
              card.window.send('card-connection-err', err.message);
              return;
            }
            card.connectCard(reader, protocol);
          });
        }
      });

      reader.on('end', () => {
        if (card.sessionInfo.cardConnected) {
          card.window.send('reader-removed', reader.name);
          card.resetConnection();
        }
      });
    });
  }

  withErrorHandler(fn: (...args: any) => Promise<void>): (ev: Event) => void {
    return async (_: Event, ...args: any) => {
      try {
        await fn.call(this, ...args);
      } catch (err: any) {
        this.window.send("card-exceptions", err.message);
      }
    }
  }

  installEventHandlers(): void {
    ipcMain.on("open-secure-channel", this.withErrorHandler(this.openSecureChannel));
    ipcMain.on("verify-pin", this.withErrorHandler(this.verifyPIN));
    ipcMain.on("verify-puk", this.withErrorHandler(this.verifyPUK));
    ipcMain.on("start-ident", this.withErrorHandler(this.identCert));
    ipcMain.on("open-destination-folder-dialog", (_) => this.openDestinationDialog());
  }
}