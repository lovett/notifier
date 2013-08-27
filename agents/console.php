<?php

error_reporting(E_ALL);

chdir(dirname(__DIR__));

require 'vendor/autoload.php';
require 'agents/Agent.php';

use Colors\Color;

$c = new Color();

$config = parse_ini_file('config.ini', true);

$message_handler = function($message) use ($config, $c) {
    $message = json_decode($message);

    $date = new DateTime($message->received);
    $date->setTimeZone(new DateTimeZone($config['agent']['timezone']));

    $start_of_day = new DateTime('0:00', new DateTimeZone($config['agent']['timezone']));

    $formatted_date = $date->format('M d \a\t h:i A');

    if ($date < $start_of_day) { // the message was received yesterday or earlier
        $message = sprintf("[%s] %s\n%s",
                           $formatted_date, $message->title, $message->body);

        if (!empty($message->url)) {
            print $c($message->url)->white() . "\n";
        }

    } else { // the message was received today
        print $c("[$formatted_date]")->green();
        print ' ';

        if (isset($message->group) && $message->group == 'reminder') {
            print $c($message->title)->cyan();
        } else {
            print $c($message->title)->yellow();
        }

        print "\n";
        print $message->body;
        print "\n";

        if (!empty($message->url)) {
            print $c($message->url)->red() . "\n";
        }

    }

    print "\n\x07";

};

$agent = new Agent($config);
$agent->setMessageHandler($message_handler);
$agent->getRecentMessages();
$agent->subscribe();
