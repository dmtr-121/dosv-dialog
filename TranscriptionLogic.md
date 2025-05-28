Transcription conceptual logic
1. If received is empty -> return
   If received is not empty -> proceed
2. If received is not Final
   If temporaryTranscripts is empty -> add received and serverOffset to temporaryTranscripts AND currentTranscription = transcripts JOIN received
   If serverOffset is already present in temporaryTranscripts AND transcripts is empty -> return
   If serverOffset is already present in temporaryTranscripts AND transcripts is NOT empty -> currentTranscription = transcripts :: CHECK IF NEEDED to output or just return
   If serverOffset is NOT present in temporaryTranscripts -> extend temporaryTranscripts with received and serverOffset AND currentTranscription = transcripts JOIN received
3. If received is Final
   If transcripts is empty AND temporaryTranscripts is empty -> extend transcripts with received AND currentTranscription = transcripts
   If transcripts is empty AND temporaryTranscripts is NOT empty -> extend transcripts with received AND temporaryTranscripts = [] AND currentTranscription = transcripts
   If transcripts is NOT empty AND serverOffset is already present in transcripts AND temporaryTranscripts is empty -> return
   If transcripts is NOT empty AND serverOffset is already present in transcripts AND temporaryTranscripts is NOT empty -> return
   If transcripts is NOT empty AND serverOffset is NOT present in transcripts AND temporaryTranscripts is empty -> extend transcripts with received AND currentTranscription = transcripts
   If transcripts is NOT empty AND serverOffset is NOT present in transcripts AND temporaryTranscripts is NOT empty -> extend transcripts with received AND temporaryTranscripts = [] AND currentTranscription = transcripts
