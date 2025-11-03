/**
 * React/Vue component structure detection
 */

import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Component } from '../../types';
import { ParsedFile } from '../../types';

export interface ComponentInfo extends Component {
  hooks: string[];
  props: string[];
  state: string[];
  children: string[]; // Child components used
}

/**
 * Detect React components from parsed file
 */
export function detectReactComponents(parsedFile: ParsedFile): ComponentInfo[] {
  const components: ComponentInfo[] = [];

  if (!parsedFile.ast) {
    return components;
  }

  const ast = parsedFile.ast as t.File;

  traverse(ast, {
    // Function components
    FunctionDeclaration(path) {
      const componentInfo = analyzeFunctionComponent(path.node, parsedFile);
      if (componentInfo) {
        components.push(componentInfo);
      }
    },

    // Arrow function components
    VariableDeclarator(path) {
      const node = path.node;
      if (
        t.isIdentifier(node.id) &&
        node.init &&
        (t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init))
      ) {
        const componentInfo = analyzeVariableComponent(
          node.id.name,
          node.init,
          parsedFile
        );
        if (componentInfo) {
          components.push(componentInfo);
        }
      }
    },

    // Class components
    ClassDeclaration(path) {
      const componentInfo = analyzeClassComponent(path.node, parsedFile);
      if (componentInfo) {
        components.push(componentInfo);
      }
    },
  });

  return components;
}

/**
 * Analyze function component
 */
function analyzeFunctionComponent(
  node: t.FunctionDeclaration,
  parsedFile: ParsedFile
): ComponentInfo | null {
  if (!node.id) {
    return null;
  }

  const name = node.id.name;
  
  // Check if it's a React component (returns JSX, has props, or name starts with capital)
  const isComponent = /^[A-Z]/.test(name) || hasJSXReturn(node.body) || hasPropsParameter(node.params);

  if (!isComponent) {
    return null;
  }

  const props = extractPropsFromParams(node.params);
  const { hooks, state } = extractHooksAndState(node.body);
  const children = extractChildComponents(node.body);

  return {
    name,
    file: parsedFile.path,
    type: 'functional',
    props,
    state,
    hooks,
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0,
    children,
  };
}

/**
 * Analyze variable component (arrow function)
 */
function analyzeVariableComponent(
  name: string,
  node: t.ArrowFunctionExpression | t.FunctionExpression,
  parsedFile: ParsedFile
): ComponentInfo | null {
  // Check if it's a React component
  const isComponent = /^[A-Z]/.test(name) || hasJSXReturn(node.body) || hasPropsParameter(node.params);

  if (!isComponent) {
    return null;
  }

  const props = extractPropsFromParams(node.params);
  const { hooks, state } = extractHooksAndState(node.body);
  const children = extractChildComponents(node.body);

  return {
    name,
    file: parsedFile.path,
    type: 'functional',
    props,
    state,
    hooks,
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0,
    children,
  };
}

/**
 * Analyze class component
 */
function analyzeClassComponent(
  node: t.ClassDeclaration,
  parsedFile: ParsedFile
): ComponentInfo | null {
  if (!node.id) {
    return null;
  }

  const name = node.id.name;

  // Check if extends React.Component or Component
  const extendsComponent = node.superClass && (
    (t.isIdentifier(node.superClass) && 
     (node.superClass.name === 'Component' || node.superClass.name === 'React.Component')) ||
    (t.isMemberExpression(node.superClass) &&
     t.isIdentifier(node.superClass.object) &&
     node.superClass.object.name === 'React' &&
     t.isIdentifier(node.superClass.property) &&
     node.superClass.property.name === 'Component')
  );

  if (!extendsComponent && !/^[A-Z]/.test(name)) {
    return null;
  }

  const props: string[] = [];
  const state: string[] = [];
  const hooks: string[] = [];

  // Extract from class body
  for (const member of node.body.body) {
    if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
      if (member.key.name === 'state' && t.isObjectExpression(member.value)) {
        // Extract state properties
        for (const prop of member.value.properties) {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            state.push(prop.key.name);
          }
        }
      }
    }

    if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
      const methodName = member.key.name;
      if (methodName === 'render') {
        const children = extractChildComponents(member.body);
        return {
          name,
          file: parsedFile.path,
          type: 'class',
          props,
          state,
          hooks,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          children,
        };
      }
    }
  }

  return {
    name,
    file: parsedFile.path,
    type: 'class',
    props,
    state,
    hooks,
    line: node.loc?.start.line || 0,
    column: node.loc?.start.column || 0,
    children: [],
  };
}

/**
 * Check if function body has JSX return
 */
function hasJSXReturn(body: t.BlockStatement | t.Expression): boolean {
  if (t.isExpression(body)) {
    return t.isJSXElement(body) || t.isJSXFragment(body);
  }

  let hasJSX = false;
  traverse(body, {
    ReturnStatement(path) {
      if (t.isJSXElement(path.node.argument) || t.isJSXFragment(path.node.argument)) {
        hasJSX = true;
        path.stop();
      }
    },
  });

  return hasJSX;
}

/**
 * Check if function has props parameter
 */
function hasPropsParameter(params: Array<t.Identifier | t.Pattern | t.RestElement>): boolean {
  if (params.length === 0) {
    return false;
  }

  const firstParam = params[0];
  if (t.isIdentifier(firstParam)) {
    return firstParam.name === 'props' || firstParam.name.toLowerCase().includes('prop');
  }

  if (t.isObjectPattern(firstParam)) {
    return true; // Destructured props
  }

  return false;
}

/**
 * Extract props from function parameters
 */
function extractPropsFromParams(
  params: Array<t.Identifier | t.Pattern | t.RestElement>
): string[] {
  const props: string[] = [];

  if (params.length === 0) {
    return props;
  }

  const firstParam = params[0];

  if (t.isObjectPattern(firstParam)) {
    // Destructured props
    for (const prop of firstParam.properties) {
      if (t.isObjectProperty(prop)) {
        if (t.isIdentifier(prop.key)) {
          props.push(prop.key.name);
        }
      } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
        props.push(prop.argument.name);
      }
    }
  } else if (t.isIdentifier(firstParam)) {
    // props object
    if (firstParam.name === 'props' || firstParam.name.toLowerCase().includes('prop')) {
      props.push('*'); // All props (not destructured)
    }
  }

  return props;
}

/**
 * Extract React hooks and state from function body
 */
function extractHooksAndState(body: t.BlockStatement | t.Expression): {
  hooks: string[];
  state: string[];
} {
  const hooks: string[] = [];
  const state: string[] = [];

  if (t.isExpression(body)) {
    return { hooks, state };
  }

  traverse(body, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee)) {
        const hookName = path.node.callee.name;

        // React hooks
        if (hookName.startsWith('use')) {
          hooks.push(hookName);

          // useState hook
          if (hookName === 'useState' && path.node.arguments.length > 0) {
            if (t.isIdentifier(path.parent)) {
              state.push(path.parent.name);
            }
          }
        }
      } else if (t.isMemberExpression(path.node.callee)) {
        // this.setState, this.state
        if (
          t.isIdentifier(path.node.callee.property) &&
          path.node.callee.property.name === 'setState'
        ) {
          // Class component setState
          state.push('*'); // All state properties
        }
      }
    },
  });

  return { hooks, state };
}

/**
 * Extract child components from JSX
 */
function extractChildComponents(body: t.BlockStatement | t.Expression): string[] {
  const children: string[] = [];

  if (t.isExpression(body)) {
    extractFromJSX(body, children);
    return children;
  }

  traverse(body, {
    JSXElement(path) {
      extractFromJSX(path.node, children);
    },
  });

  return Array.from(new Set(children)); // Remove duplicates
}

/**
 * Extract component names from JSX
 */
function extractFromJSX(node: t.JSXElement | t.JSXFragment | t.Expression, children: string[]): void {
  if (t.isJSXElement(node)) {
    const opening = node.openingElement;
    if (t.isJSXIdentifier(opening.name)) {
      const name = opening.name.name;
      // Check if it's a component (starts with capital)
      if (/^[A-Z]/.test(name)) {
        children.push(name);
      }
    }

    // Recurse into children
    for (const child of node.children) {
      if (t.isJSXElement(child) || t.isJSXFragment(child)) {
        extractFromJSX(child, children);
      }
    }
  } else if (t.isJSXFragment(node)) {
    for (const child of node.children) {
      if (t.isJSXElement(child) || t.isJSXFragment(child)) {
        extractFromJSX(child, children);
      }
    }
  }
}

