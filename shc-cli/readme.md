# SHC

## share in minimum steps (Heavily Work in Progress)

## Install

```console
curl -fsSl https:/shc-frontend-two.vercel.app/install.sh | sh
```

## How to use?

```console
Usage: shc [COMMAND]

Commands:
    login       login to use shc
    add         upload file
    list        list all files
    remove      remove filef
    visibility  toggle file's visibility
    rename      rename file
    get         download file
    logout      logout from shc
    help        Print this message or the help of the given subcommand(s)

Options:
    -h, --help  Print help
```

## Backend URL Override

By default, `shc` uses the production backend:

`https://shc-backend-production.up.railway.app`

To use a local backend (for OTP/debugging), set this env var before running commands:

```powershell
$env:SHC_BACKEND_API_BASE_URL = "http://localhost:<your-backend-port>"
# Example: http://localhost:6969
shc login
```

Notes:
- If `SHC_BACKEND_API_BASE_URL` is set, it always takes priority.
- If production OTP fails with SMTP timeout, `shc login` auto-tries local backends (`6969`, then `3000`).
- On successful login without env override, CLI remembers the backend URL in `~/.shc-cli/config.toml` for future commands.

### TODOs

- [ ] Share a portion of a file
- [ ] Resume Upload
- [ ] gracefull exit
- [ ] command aliases
- [ ] improve code by studying aim
- [ ] highlight imp words in output
- [ ] new text file
- [ ] custom download path
- [ ] shc get < link / id >
- [ ] can we render html on cli or backend?
- [ ] Path vs PathBuf
- [ ] dynamic name width?
- [ ] install script -WIP
- [ ] pretty error messages
- [ ] generic config to create more config like user_config
- [ ] make user and userInfo same
- [ ] fix mut & if needed
- [ ] better email otp template
- [ ] pre-compiled binaries
- [ ] restart terminal message
- [ ] how to start using message after installation
- [ ] fix ajaysharmadev zip
- [ ] show description of different properties on file details property page
- [ ] load balancing between two servers?
- [ ] bin command?
