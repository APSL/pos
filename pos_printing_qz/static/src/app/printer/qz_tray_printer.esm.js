/** @odoo-module **/
/* global window, document, console, fetch */

import {rpc} from "@web/core/network/rpc";
import {QZConnection} from "./qz_tray_connection.esm";
import {htmlToCanvas} from "@point_of_sale/app/printer/render_service";
/**
 * QZTrayPrinter
 * -------------
 * POS printer driver that uses QZ Tray to send ESC/POS commands.
 * It requests the backend to convert the HTML receipt into ESC/POS bytes
 * using python-escpos, and then sends them to the QZ Tray client.
 */
export class QZTrayPrinter {
    constructor(name) {
        this.name = name || "QZTray Printer";
        this.type = "qztray";
    }

    /**
     * Print a POS receipt element by converting its HTML to ESC/POS.
     * @param {HTMLElement} el - The HTML element representing the receipt.
     * @returns {Promise<{successful: boolean, message?: object}>}
     */
    async printReceipt(el) {
        let activeConnection = false;

        try {
            // 1) Intentamos extraer el orderId del ticket estándar del POS
            const orderId = this._extractOrderId(el);

            // ---------------------------------------------------------------------
            // CASO A: Ticket de pedido (hay orderId) → usar ESC/POS
            // ---------------------------------------------------------------------
            if (orderId) {
                const escpos_data = await rpc("/pos/escpos/receipt", {
                    order_id: orderId,
                });

                const cashdrawer = "\x1B\x70\x00\x19\x19";

                activeConnection = true;
                await QZConnection.print(this.name, [
                    {type: "raw", format: "base64", data: escpos_data},
                    cashdrawer,
                ]);

                return {successful: true};
            }
            console.info(
                "[POS][QZTray] No order detected → printing native Odoo ticket."
            );
            const canvas = await htmlToCanvas(el, {addClass: "pos-receipt-print"});
            const pngBase64 = canvas
                .toDataURL("image/png")
                .replace(/^data:image\/png;base64,/, "");
            const escpos_data = await rpc("/pos/escpos/render-image", {
                png_base64: pngBase64,
            });
            activeConnection = true;
            await QZConnection.print(this.name, [
                {
                    type: "raw",
                    format: "base64",
                    data: escpos_data,
                },
            ]);

            return {successful: true};
        } catch (error) {
            console.error("[POS][QZTray] Printing error:", error);
            return {
                successful: false,
                message: {
                    title: "Printing Error",
                    body: error.message || "Unable to print using QZ Tray.",
                },
            };
        } finally {
            if (activeConnection) {
                try {
                    await QZConnection.disconnect();
                } catch {
                    /* Ignore */
                }
            }
        }
    }

    async openCashbox() {
        try {
            const opencashcommand = "\x1B\x70\x00\x19\x19";
            await QZConnection.print(this.name, [
                {type: "raw", format: "base64", data: opencashcommand},
                opencashcommand,
            ]);
            return {successful: true};
        } catch (error) {
            console.error("[POS][QZTray] ESC/POS Open Chasdrawer error:", error);
            return {
                successful: false,
                message: {
                    title: "ESC/POS Print Error",
                    body: error.message || "Could not open chashdrawer via QZ Tray.",
                },
            };
        } finally {
            try {
                await QZConnection.disconnect();
            } catch {
                /* Ignore disconnect errors */
            }
        }
    }

    _extractOrderId(el) {
        const html = el?.outerHTML || "";
        const match = html.match(/\b\d{5}-\d{3}-\d{4}\b/);
        return match ? match[0] : null;
    }
}
