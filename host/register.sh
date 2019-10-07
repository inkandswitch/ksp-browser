#!/bin/bash

cd $(dirname $0)

mkdir -p /Library/Google/Chrome/NativeMessagingHosts
cp com.pushpin.pushpin.json /Library/Google/Chrome/NativeMessagingHosts
