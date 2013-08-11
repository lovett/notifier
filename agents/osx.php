<?php

error_reporting(E_ALL);

chdir(dirname(__DIR__));

require 'vendor/autoload.php';
require 'agents/Agent.php';

$message_handler = function($message) {
    $message = json_decode($message);
    $date = date('M d \a\t h:i A', strtotime($message->timestamp));

    $title = escapeshellarg($message->title);
    $message = escapeshellarg($message->body);

    exec("terminal-notifier -message $message -title $title");
};

$agent = new Agent('config.ini');
$agent->setMessageHandler($message_handler);
$agent->run();
