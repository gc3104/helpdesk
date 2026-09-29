"""Test request model validation and input normalization."""

import unittest

from pydantic import ValidationError

from app.schemas import LoginRequest, PasswordChangeRequest, RegisterRequest, TicketCreate, TicketUpdate


class RequestValidationTests(unittest.TestCase):
    """Exercise the API request models' validation rules."""

    def test_registration_trims_identity_fields_but_preserves_password(self):
        """Trim identity fields without changing password whitespace."""
        request = RegisterRequest(
            name="  Ada Lovelace  ",
            email=" ada@example.com ",
            password=" Pass word9! ",
        )

        self.assertEqual(request.name, "Ada Lovelace")
        self.assertEqual(request.email, "ada@example.com")
        self.assertEqual(request.password, " Pass word9! ")

    def test_registration_rejects_blank_name_and_password(self):
        """Reject names and passwords containing only whitespace."""
        with self.assertRaises(ValidationError):
            RegisterRequest(name="   ", email="ada@example.com", password="password")
        with self.assertRaises(ValidationError):
            RegisterRequest(name="Ada", email="ada@example.com", password="        ")

    def test_login_trims_email(self):
        """Normalize email whitespace before validating login data."""
        request = LoginRequest(email=" ada@example.com ", password="password")

        self.assertEqual(request.email, "ada@example.com")

    def test_registration_requires_each_password_character_class(self):
        """Require uppercase, lowercase, numeric, and symbol characters."""
        for password in ("password9!", "PASSWORD9!", "Password!!", "Password99"):
            with self.subTest(password=password):
                with self.assertRaises(ValidationError):
                    RegisterRequest(name="Ada", email="ada@example.com", password=password)

    def test_login_does_not_require_registration_password_complexity(self):
        """Allow existing accounts to sign in with older password rules."""
        request = LoginRequest(email="ada@example.com", password="password")

        self.assertEqual(request.password, "password")

    def test_password_change_uses_registration_password_rules(self):
        """Apply registration password strength rules to password changes."""
        request = PasswordChangeRequest(current_password="current", new_password="NewPass9!")

        self.assertEqual(request.new_password, "NewPass9!")
        with self.assertRaises(ValidationError):
            PasswordChangeRequest(current_password="current", new_password="weakpass")

    def test_ticket_fields_are_trimmed_and_length_checked_afterward(self):
        """Trim ticket text before checking field lengths."""
        request = TicketCreate(
            title="  Login issue  ",
            description="  A sufficiently detailed issue  ",
            category="  Billing  ",
        )

        self.assertEqual(request.title, "Login issue")
        self.assertEqual(request.description, "A sufficiently detailed issue")
        self.assertEqual(request.category, "Billing")

    def test_ticket_create_and_update_reject_blank_fields(self):
        """Reject blank ticket text for both create and update payloads."""
        valid_fields = {
            "title": "Valid title",
            "description": "A sufficiently detailed issue",
            "category": "IT",
        }
        for field in valid_fields:
            with self.subTest(field=field):
                invalid_fields = {**valid_fields, field: "   "}
                with self.assertRaises(ValidationError):
                    TicketCreate.model_validate(invalid_fields)
                with self.assertRaises(ValidationError):
                    TicketUpdate.model_validate({**invalid_fields, "priority": "Medium"})

    def test_ticket_text_limits_apply_after_trimming(self):
        """Reject ticket titles that exceed their limit after trimming."""
        with self.assertRaises(ValidationError):
            TicketCreate(
                title=f"{'x' * 141} ",
                description="A sufficiently detailed issue",
                category="IT",
            )


if __name__ == "__main__":
    unittest.main()