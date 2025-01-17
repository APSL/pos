# Copyright 2024 (APSL-Nagarro) - Antoni Marroig
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from datetime import date, timedelta

from odoo import api, models


class LoyaltyCard(models.Model):
    _inherit = "loyalty.card"

    @api.model_create_multi
    def create(self, vals_list):
        res = super().create(vals_list)
        # If the expiration date is not set, we set it to
        # the current date + the fixed duration
        if vals_list:
            if not vals_list[0].get("expiration_date", False):
                for record in res:
                    if record.program_id and record.program_id.duration_days > 0:
                        res.expiration_date = date.today() + timedelta(
                            days=res.program_id.duration_days
                        )
        return res
