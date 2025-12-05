Feature: Media Upload
  As a user
  I want to upload images from my device
  So that I can share photos and media content

  Background:
    Given I am on the Media Upload screen
    And I have granted media library permissions

  Scenario: Upload image from gallery
    Given I click the "Choose from Library" button
    And I select an image from the gallery
    When the image is selected
    Then I should see the selected image displayed
    And the image should be available for upload

  Scenario: Take photo with camera
    Given I have granted camera permissions
    When I click the "Take Photo" button
    And I take a photo with the camera
    Then I should see the captured photo displayed
    And the photo should be available for upload

  Scenario: Upload multiple images
    Given I click the "Choose from Library" button
    And I select multiple images (up to 5)
    When the images are selected
    Then I should see all selected images displayed
    And I should see the count "Selected Images (X/5)"

  Scenario: Remove uploaded image
    Given I have selected an image
    And the image is displayed
    When I click the remove button on the image
    Then the image should be removed from the selection
    And the image should no longer be displayed

  Scenario: Request media library permission
    Given I have not granted media library permissions
    When I click the "Choose from Library" button
    Then I should see a permission request dialog
    And I should be able to grant or deny permissions

  Scenario: Request camera permission
    Given I have not granted camera permissions
    When I click the "Take Photo" button
    Then I should see a permission request dialog
    And I should be able to grant or deny permissions

  Scenario: Handle permission denial
    Given I deny media library permissions
    When I try to access the gallery
    Then I should see an error message about permission being required
    And I should not be able to select images

