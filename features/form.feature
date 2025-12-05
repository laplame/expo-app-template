Feature: Form Management
  As a user
  I want to fill out and submit forms
  So that I can provide information and interact with the application

  Background:
    Given I am on the Form screen
    And the form is displayed

  Scenario: Submit a valid form
    Given I fill in the "Full Name" field with "John Doe"
    And I fill in the "Email" field with "john.doe@example.com"
    And I fill in the "Phone Number" field with "1234567890"
    And I fill in the "Message" field with "This is a test message"
    When I click the "Submit Form" button
    Then I should see a success message
    And the form data should be submitted

  Scenario: Submit form with required fields missing
    Given I leave the "Full Name" field empty
    And I leave the "Email" field empty
    When I click the "Submit Form" button
    Then I should see an error message for "Full Name"
    And I should see an error message for "Email"
    And the form should not be submitted

  Scenario: Submit form with invalid email format
    Given I fill in the "Full Name" field with "John Doe"
    And I fill in the "Email" field with "invalid-email"
    When I click the "Submit Form" button
    Then I should see an error message indicating invalid email format
    And the form should not be submitted

  Scenario: Clear form errors when user starts typing
    Given I have an error message displayed for "Full Name"
    When I start typing in the "Full Name" field
    Then the error message should disappear

