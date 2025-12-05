Feature: GPS Navigation
  As a user
  I want to access my current location and navigate using GPS
  So that I can track my position and get location-based services

  Background:
    Given I am on the GPS Navigation screen
    And I have granted location permissions

  Scenario: Get current location
    Given I click the "Get Current Location" button
    When the location is retrieved
    Then I should see my current latitude displayed
    And I should see my current longitude displayed
    And I should see the location accuracy
    And the location data should be updated

  Scenario: Display location details
    Given I have retrieved my current location
    When the location data is displayed
    Then I should see the latitude coordinate
    And I should see the longitude coordinate
    And I should see the accuracy in meters (if available)
    And I should see the altitude in meters (if available)
    And I should see the speed in m/s (if available)
    And I should see the heading in degrees (if available)

  Scenario: Watch location updates
    Given I click the "Watch Location" button
    When location watching is active
    Then my location should be updated automatically
    And I should see updated coordinates as I move
    And the location data should refresh periodically

  Scenario: Stop watching location
    Given I am watching my location
    When I click the "Stop Watching" button
    Then location updates should stop
    And the watch status should be inactive

  Scenario: Request location permission
    Given I have not granted location permissions
    When I try to get my current location
    Then I should see a permission request dialog
    And I should be able to grant or deny permissions

  Scenario: Handle permission denial
    Given I deny location permissions
    When I try to get my current location
    Then I should see an error message about permission being required
    And I should not be able to retrieve location data

  Scenario: Handle location retrieval error
    Given GPS is unavailable or disabled
    When I try to get my current location
    Then I should see an error message
    And the error should be clearly displayed to the user

  Scenario: Format location coordinates
    Given I have retrieved my location
    When the coordinates are displayed
    Then latitude should be formatted to 6 decimal places
    And longitude should be formatted to 6 decimal places

