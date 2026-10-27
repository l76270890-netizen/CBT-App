Get-CimInstance Win32_Process -Filter "Name LIKE 'python%'" |
    Select-Object ProcessId, CommandLine | Format-List
