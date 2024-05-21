const core = require('@actions/core');
const github = require('@actions/github');

function parseVersion(version) {
    const snapshot = version.includes('-SNAPSHOT');
    const versionParts = version.replace('-SNAPSHOT', '').split('.').map(Number);
    return { versionParts, snapshot };
}

function incrementVersion(versionParts, strategy) {
    if (strategy === 'major') {
        versionParts[0] += 1;
        versionParts[1] = 0;
        versionParts[2] = 0;
    } else if (strategy === 'minor') {
        versionParts[1] += 1;
        versionParts[2] = 0;
    } else { // default to patch
        versionParts[2] += 1;
    }
    return versionParts.join('.');
}

function getTargetVersion(head_ref, base_ref, strategy, current_version) {
    let { versionParts, snapshot } = parseVersion(current_version);
    let targetVersion;

    if (!head_ref && !base_ref) {
        // Logic for when both head_ref and base_ref are not specified
        targetVersion = incrementVersion(versionParts, strategy);
    } else if (base_ref === 'development' && !head_ref.startsWith('release/') && !head_ref.startsWith('hotfix/')) {
        targetVersion = incrementVersion(versionParts, 'patch');
        if (!snapshot) {
            targetVersion += '-SNAPSHOT';
        } else {
            targetVersion += '-SNAPSHOT';
        }
    } else if (base_ref === 'candidate_release' && head_ref === 'development') {
        targetVersion = incrementVersion(versionParts, 'minor');
    } else if (head_ref.startsWith('release/') && base_ref === 'development') {
        targetVersion = incrementVersion(versionParts, 'minor') + '-SNAPSHOT';
    } else if (base_ref.startsWith('hotfix/')) {
        targetVersion = incrementVersion(versionParts, 'minor');
    } else if (head_ref.startsWith('hotfix/') && base_ref === 'development') {
        targetVersion = incrementVersion(versionParts, 'patch') + '-SNAPSHOT';
    }

    if (strategy !== 'patch') {
        targetVersion = incrementVersion(parseVersion(current_version).versionParts, strategy);
    }

    return targetVersion;
}

function run() {
    try {
        const head_ref = core.getInput('head_ref');
        const base_ref = core.getInput('base_ref');
        const strategy = core.getInput('strategy') || 'patch';
        const current_version = core.getInput('current_version');

        if (!current_version) {
            throw new Error('Missing required input: current_version');
        }

        const target_version = getTargetVersion(head_ref, base_ref, strategy, current_version);
        core.setOutput('target_version', target_version);

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
