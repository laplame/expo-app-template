Feature: Navigation and Drawer Menu
  As a user
  I want to navigate between different screens using a drawer menu
  So that I can access all features of the application easily

  Background:
    Given I am on any screen in the application
    And the drawer menu is available

  Scenario: Open drawer menu
    Given I am on the Home screen
    When I click the hamburger menu button (☰) in the header
    Then the drawer menu should slide in from the left
    And I should see all available menu options

  Scenario: Navigate to Home from drawer
    Given the drawer menu is open
    When I click on the "Home" menu item
    Then the drawer should close
    And I should be navigated to the Home screen
    And the Home screen should be displayed

  Scenario: Navigate to Details from drawer
    Given the drawer menu is open
    When I click on the "Details" menu item
    Then the drawer should close
    And I should be navigated to the Details screen
    And the Details screen should be displayed

  Scenario: Navigate to Form from drawer
    Given the drawer menu is open
    When I click on the "Form" menu item
    Then the drawer should close
    And I should be navigated to the Form screen
    And the Form screen should be displayed

  Scenario: Navigate to Media Upload from drawer
    Given the drawer menu is open
    When I click on the "Media Upload" menu item
    Then the drawer should close
    And I should be navigated to the Media Upload screen
    And the Media Upload screen should be displayed

  Scenario: Navigate to GPS Navigation from drawer
    Given the drawer menu is open
    When I click on the "GPS Navigation" menu item
    Then the drawer should close
    And I should be navigated to the GPS Navigation screen
    And the GPS Navigation screen should be displayed

  Scenario: Close drawer by swiping
    Given the drawer menu is open
    When I swipe the drawer to the left
    Then the drawer should close
    And I should remain on the current screen

  Scenario: Display drawer menu items with icons
    Given the drawer menu is open
    When I view the menu items
    Then each menu item should have an icon
    And the icons should be clearly visible
    And the menu items should be properly labeled

  Scenario: Navigate with parameters
    Given the drawer menu is open
    When I click on the "Details" menu item
    Then the navigation should include the itemId parameter
    And the Details screen should receive the parameter correctly

