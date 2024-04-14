#!/bin/bash
# Readme
    ## This script restores a backup to our dev database-server into a test database so we can check specific backups before we restore them to production
    ## The database needs to be called "production" on the production server AND the test server
    ## All of this only works on the production machine with borgmatic configs and valid ssh-keys for the backup server set up!
# List DB-Dumps
    ## borgmatic list --archive latest --find .borgmatic/*_databases
    ## Clock maybe +-2 hours
# Restore:
    ## https://torsion.org/borgmatic/docs/how-to/extract-a-backup/
    ## https://torsion.org/borgmatic/docs/how-to/backup-your-databases/#restore-to-an-alternate-host
    ## change latest to the desired backup (currently latest). Example: GOALS_borgbase_bsvs-hefl-1-2024-04-12-234652
# Logs
    ## check /var/log/syslog
    ## https://torsion.org/borgmatic/docs/how-to/inspect-your-backups/#logging

borgmatic restore --repository ssh://jsoau056@jsoau056.repo.borgbase.com/./repo --archive GOALS_borgbase_bsvs-hefl-1-2024-04-12-234652 --database production --hostname 172.17.0.1 --port 3002 --username root --password qzx5vQG9WQ2b35eZUWujPUhVb8xRr