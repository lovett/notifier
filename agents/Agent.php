<?php

class Agent {

    private $_config;
    private $_redis;
    private $_message_handler;

    public function __construct($config_file) {
        $this->_config = parse_ini_file($config_file, true);

        $this->_redis = new Predis\Client($this->_config['redis_client']);
    }

    public function setMessageHandler($function) {
        $this->_message_handler = $function;
    }

    public function run() {
        $this->getQueuedMessages();
        $this->subscribe();
    }

    private function getQueuedMessages() {
        while ($message = $this->_redis->lpop($this->_config['pubsub']['queue'])) {
            $this->handleMessage($message);
        }
    }

    private function subscribe() {
        $pubsub = $this->_redis->pubSub();
        $pubsub->subscribe($this->_config['pubsub']['channel']);

        foreach ($pubsub as $message) {
            if ($message->kind !== 'message') {
                continue;
            }

            if ($message->channel == 'control_channel' && $message->payload == 'quit_loop') {
                $pubsub->unsubscribe();
                break;
            }

            if ($message->channel == 'control_channel') {
                //print "Received an unrecognized command: {$message->payload}.\n";
                $pubsub->unsubscribe();
                break;
            }

            $this->handleMessage($message->payload);
        }

        unset($pubsub);
    }

    private function handleMessage($message) {
        call_user_func($this->_message_handler, $message);
    }

}