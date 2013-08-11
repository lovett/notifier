<?php

error_reporting(E_ALL);

chdir(dirname(__DIR__));

require 'vendor/autoload.php';
require 'agents/Agent.php';

use Colors\Color;

$c = new Color();

$message_handler = function($message) use ($c) {
    $message = json_decode($message);
    $date = date('M d \a\t h:i A', strtotime($message->timestamp));
    $date = $c("[$date]")->green();
    printf("%s %s\n%s\n\n", $date, $message->title, $message->body);
    print "\x07";
};

$agent = new Agent('config.ini');
$agent->setMessageHandler($message_handler);
$agent->run();
