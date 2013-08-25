<?php

class Agent {

    private $_config;
    private $_redis;
    private $_message_handler;

    public function __construct($config) {
        $this->_config = $config;

        $this->_redis = new Predis\Client($this->_config['redis']);
    }

    public function setMessageHandler($function) {
        $this->_message_handler = $function;
    }

    public function getRecentMessages() {
        $messages = $this->_redis->lrange($this->_config['pubsub']['archive'], -5, -1);
        foreach ($messages as $message) {
            $this->handleMessage($message);
        }
    }

    public function subscribe() {
        $pubsub = $this->_redis->pubSub();
        $pubsub->subscribe($this->_config['pubsub']['queue']);

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