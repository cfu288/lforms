ARG VARIANT="jammy"
FROM buildpack-deps:${VARIANT}-curl

RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

# Install basic development tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends less man-db sudo software-properties-common \
    && apt-get -y install --no-install-recommends curl gnupg build-essential xdg-utils \ 
    # chromium-browser \
    && apt-get -y install --no-install-recommends xvfb git \
    # && apt-get -y install --no-install-recommends libgconf2-4 libnss3-1d libxss1 \
    # remove useless files from the current layer
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/lib/apt/lists.d/* 

ARG NODE_VERSION="14"

RUN curl --silent --location https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    # remove useless files from the current layer
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/lib/apt/lists.d/* \
    # smoke tests
    && node --version \
    && npm --version

# Set the Chrome repo.
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list

# Install Chrome.
RUN apt-get update && apt-get -y install google-chrome-stable

# Set CHROME_BIN environment variable
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true
