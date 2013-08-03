Feature: Receive message
    As a message publisher
    In order to broadcast a message to clients
    I need an HTTP endpoint that accepts valid messages

    Scenario: Reject a message submitted via GET
        When I send a GET request to "/message"
        Then the response code should be 405

    Scenario: Reject an empty message submitted via POST
        When I send a POST request to "/message" with body:
        """
        """
        Then the response code should be 400

    Scenario: Accept a message with at least one property
        When I send a POST request to "/message" with body:
        """
        title=foo
        """
        Then the response code should be 200
        And the response should contain "OK"

    Scenario: Accept a message with more than one property
        When I send a POST request to "/message" with values:
            | title  | url |
            | foo    | bar |
        Then the response code should be 200
        And the response should contain "OK"

    Scenario: Ignore invalid properties
        When I send a POST request to "/message" with values:
            | bogus1 | bogus2 |
            | foo    | bar    |
        Then the response code should be 400
