"use strict";
import * as vscode from 'vscode';
import { ColorThemeKind } from 'vscode'
import * as colorConvert from 'color-convert'

function get_color(uri: vscode.Uri): string | undefined {
    let config = vscode.workspace.getConfiguration('vscode-mr-workspace', uri);
    const color = config.inspect('color');
    if (color === undefined || color.workspaceFolderValue === undefined) return undefined;

    return color.workspaceFolderValue as string;
}

function copy_colors(): Object {
    const workbench = vscode.workspace.getConfiguration('workbench');
    const colorCustomizations = workbench.inspect('colorCustomizations');
    const colors = {};
    if (colorCustomizations === undefined || colorCustomizations.workspaceValue === undefined) return colors;

    Object.keys(colorCustomizations.workspaceValue).forEach(key => {
        if (key == 'activityBar.border' || key == 'statusBar.border' || key == 'tab.activeBorderTop' || key == 'tab.activeBorder') return;
        colors[key] = workbench.colorCustomizations[key];
    });
    return colors;
}

function apply_color(color: string) {
    const config = vscode.workspace.getConfiguration("vscode-mr-workspace");
    const workbench = vscode.workspace.getConfiguration('workbench');
    const colors = copy_colors();

    if (config.panel)
        Object.assign(colors, { ['activityBar.border']: color })
    if (config.statusbar)
        Object.assign(colors, { ['statusBar.border']: color })
    if (config.tabbar == 'top')
        Object.assign(colors, { ['tab.activeBorderTop']: color })
    else if (config.tabbar == 'bottom')
        Object.assign(colors, { ['tab.activeBorder']: color })
    workbench.update('colorCustomizations', colors, vscode.ConfigurationTarget.Workspace);
}

function reset_color() {
    const workbench = vscode.workspace.getConfiguration('workbench');
    workbench.update('colorCustomizations', copy_colors(), vscode.ConfigurationTarget.Workspace);
}

function update_color(uri: vscode.Uri) {
    // Colors from https://github.com/mnespor/vscode-color-identifiers-mode
    const colors = [0.0, 0.5, 0.1, 0.6, 0.2, 0.7, 0.3, 0.8, 0.4, 0.9];
    const config = vscode.workspace.getConfiguration("vscode-mr-workspace");

    const ws = vscode.workspace.getWorkspaceFolder(uri);
    if (ws === undefined || vscode.workspace.workspaceFolders.length < 2) {
        reset_color();
        return;
    }

    let color = get_color(uri);
    if (color === undefined) {
        const idx = ws.index % colors.length;
        const lightTheme = vscode.window.activeColorTheme.kind === ColorThemeKind.Light ||
            vscode.window.activeColorTheme.kind === ColorThemeKind.HighContrastLight;
        const luminance = lightTheme ? config.luminance_light : config.luminance_dark;
        color = "#" + colorConvert.hsl.hex([360.0 * colors[idx], config.saturation, luminance]);
    }
    apply_color(color);
}

export function activate(context: vscode.ExtensionContext) {
    const on_change = vscode.window.onDidChangeActiveTextEditor(event => {
        if (event === undefined || event.document === undefined) return;
        update_color(event.document.uri);
    });

    const on_close = vscode.workspace.onDidCloseTextDocument(event => {
        if (vscode.window.visibleTextEditors.length != 0) return;

        reset_color();
    });

    const on_reconf = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("vscode-mr-workspace")) {
            if (vscode.window.activeTextEditor === undefined ||
                vscode.window.activeTextEditor.document === undefined ||
                vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri) === undefined) {
                reset_color();
                return;
            }

            update_color(vscode.window.activeTextEditor.document.uri);
        }
    })

    update_color(vscode.window.activeTextEditor.document.uri);
    context.subscriptions.push(on_change, on_close, on_reconf);
}

export function deactivate() {
    reset_color();
}
