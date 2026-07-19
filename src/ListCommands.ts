import * as vscode from 'vscode';

export async function listAllCommands(
    output: vscode.OutputChannel
): Promise<void> {

    output.appendLine('===========================================');
    output.appendLine('Listing ALL VS Code Commands');
    output.appendLine('===========================================');

    const commands = await vscode.commands.getCommands(true);

    output.appendLine(`Total Commands: ${commands.length}`);
    output.appendLine('');

    // Print every command
    commands
        .sort((a, b) => a.localeCompare(b))
        .forEach(cmd => output.appendLine(cmd));

    output.appendLine('');
    output.appendLine('===========================================');
    output.appendLine('Filtered Commands');
    output.appendLine('===========================================');

    const keywords = [
        'chat',
        'copilot',
        'inline',
        'edit',
        'hunk',
        'accept',
        'keep',
        'undo',
        'agent'
    ];

    const filtered = commands
        .filter(cmd =>
            keywords.some(k => cmd.toLowerCase().includes(k))
        )
        .sort((a, b) => a.localeCompare(b));

    filtered.forEach(cmd => output.appendLine(cmd));

    output.appendLine('');
    output.appendLine(`Filtered Count: ${filtered.length}`);

    output.show(true);
}