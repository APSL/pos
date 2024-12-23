# Copyright 2024 Antoni Marroig(APSL-Nagarro)<amarroig@apsl.net>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import api, models


class PosSession(models.Model):
    _inherit = "pos.session"

    @api.model_create_multi
    def create(self, vals_list):
        res = super().create(vals_list)
        if res.config_id.session_sequence_id:
            pos_name = res.config_id.session_sequence_id._next()
            res.update({"name": pos_name})
        return res
