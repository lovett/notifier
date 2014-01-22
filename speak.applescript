on run argv
	set resumePlayback to false
	if application "iTunes" is running then
		tell application "iTunes"
			if player state is playing then
				pause
				say "Excuse me."
				set resumePlayback to true
			end if
		end tell
	end if
	display notification (item 1 of argv) with title "Notifier"
	
	say item 1 of argv
	if resumePlayback then
		tell application "iTunes"
			delay 1
			play
		end tell
	end if
end run
