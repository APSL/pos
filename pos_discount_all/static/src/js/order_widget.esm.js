/** @odoo-module */

/*
    Copyright (C) 2022-Today GRAP (http://www.grap.coop)
    @author Sylvain LE GAL (https://twitter.com/legalsylvain)
    Copyright 2024 (APSL-Nagarro) - Antoni Marroig
    License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
*/

import {OrderWidget} from "@point_of_sale/app/generic_components/order_widget/order_widget";
import {patch} from "@web/core/utils/patch";
import {usePos} from "@point_of_sale/app/store/pos_hook";

patch(OrderWidget.prototype, {
    setup() {
        super.setup();
        this.props.pos = usePos();
    },
});
