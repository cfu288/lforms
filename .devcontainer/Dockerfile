# Define the base image variant
ARG VARIANT="jammy"
FROM buildpack-deps:${VARIANT}-curl

# Add the `lforms-dev` user
ARG USERNAME=lforms-dev

# Create a new group and user 'node'
RUN groupadd --gid 1000 ${USERNAME} \
  && useradd --uid 1000 --gid ${USERNAME} --shell /bin/bash --create-home ${USERNAME}

# Add Google's public key and set the Chrome repo
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list

# Update package list and install development tools
RUN apt update && export DEBIAN_FRONTEND=noninteractive \
    && apt -y install --no-install-recommends \
        build-essential \
        curl \
        git \
        gnupg \
        google-chrome-stable \
        less \
        man-db \
        software-properties-common \
        sudo \
        xdg-utils \
        xvfb \
    # Clean up unnecessary files to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/lib/apt/lists.d/* 

# Define the Node.js version to install
ARG NODE_VERSION="14"

# Install Node.js
RUN curl --silent --location https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt install -y nodejs \
    # Clean up unnecessary files to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/lib/apt/lists.d/* \
    # Verify Node.js and npm installation
    && node --version \
    && npm --version

# Set the path to the Chrome binary
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# Preserve bash history across rebuilds
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    && mkdir /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R $USERNAME /commandhistory \
    && echo "$SNIPPET" >> "/home/$USERNAME/.bashrc"

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true
