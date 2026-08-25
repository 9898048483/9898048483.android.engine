import os
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials

# NOTE: This implementation assumes you have completed the OAuth flow 
# and have valid credentials stored.
def upload_folder_to_drive(folder_path, drive_service):
    # Create the root folder in Drive
    folder_metadata = {
        'name': 'AI_Secure_Space_Backup',
        'mimeType': 'application/vnd.google-apps.folder'
    }
    folder = drive_service.files().create(body=folder_metadata, fields='id').execute()
    folder_id = folder.get('id')
    print(f'Created Drive folder with ID: {folder_id}')

    # Upload all files in the directory to the created folder
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            # Create file metadata
            file_metadata = {
                'name': file,
                'parents': [folder_id]
            }
            media = MediaFileUpload(file_path, resumable=True)
            drive_service.files().create(body=file_metadata, media_body=media).execute()
            print(f'Uploaded: {file}')

# Entry point for the sync action
def run_backup(creds_data):
    creds = Credentials.from_authorized_user_info(creds_data)
    service = build('drive', 'v3', credentials=creds)
    # Upload the entire project directory
    upload_folder_to_drive('.', service)
