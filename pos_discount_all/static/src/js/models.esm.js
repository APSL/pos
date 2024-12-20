/** @odoo-module */

/*
    Copyright (C) 2022-Today GRAP (http://www.grap.coop)
    @author Sylvain LE GAL (https://twitter.com/legalsylvain)
    Copyright 2024 (APSL-Nagarro) - Antoni Marroig
    License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
*/

import {Order, Orderline} from "@point_of_sale/app/store/models";
import {patch} from "@web/core/utils/patch";
import {roundPrecision as round_pr} from "@web/core/utils/numbers";

patch(Order.prototype, {
    _get_ignored_product_ids_total_discount() {
        const productIds = super._get_ignored_product_ids_total_discount(...arguments);
        for (const product in this.pos.db.product_by_id) {
            if (product.is_discount) {
                productIds.push(product.id);
            }
        }
        return productIds;
    },
    get_total_with_tax_without_any_discount() {
        return round_pr(
            this.orderlines.reduce(function (sum, orderLine) {
                return sum + orderLine.get_total_without_any_discount().total_included;
            }, 0),
            this.pos.currency.rounding
        );
    },
    get_discount_amount_with_tax_without_any_discount() {
        return round_pr(
            this.get_total_with_tax_without_any_discount() - this.get_total_with_tax(),
            this.pos.currency.rounding
        );
    },
    export_for_printing() {
        var receipt = super.export_for_printing(...arguments);
        receipt.total_discount =
            this.get_discount_amount_with_tax_without_any_discount();
        return receipt;
    },
});

patch(Orderline.prototype, {
    get_total_without_any_discount() {
        var product = this.get_product();
        const ignored_product_ids =
            this.order._get_ignored_product_ids_total_discount();
        if (ignored_product_ids.includes(product.id)) {
            return {
                total_excluded: 0.0,
                total_included: 0.0,
            };
        }
        var price_unit_without_any_discount = product.get_price(
            this.pos.default_pricelist,
            this.get_quantity()
        );
        var taxes_ids = this.tax_ids || product.taxes_id;
        taxes_ids = taxes_ids.filter((t) => t in this.pos.taxes_by_id);
        var product_taxes = this.pos.get_taxes_after_fp(
            taxes_ids,
            this.order.fiscal_position
        );
        var all_taxes_without_any_discount = this.compute_all(
            product_taxes,
            price_unit_without_any_discount,
            this.get_quantity(),
            this.pos.currency.rounding
        );
        return {
            total_excluded: all_taxes_without_any_discount.total_excluded,
            total_included: all_taxes_without_any_discount.total_included,
        };
    },
});
