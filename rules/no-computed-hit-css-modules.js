// @ts-check

const message = `Computed hit cannot be injected`;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    schema: [
      {
        type: 'object',
        properties: {
          cssModulesSuffix: {
            type: 'string',
            default: '.module.css',
          },
        },
      },
    ],
  },
  create(context) {
    /** @param node {import('estree').Expression} */
    const checkExpression = (node) => {
      if (node.type !== 'Identifier' || !importSpecifiers.has(node.name)) {
        return;
      }

      context.report({
        node,
        message,
      });
    };

    const options = context.options;

    const importSpecifiers = new Set();

    /** @type {string} */
    let cssModulesSuffix = '.module.css';

    options.forEach((option) => {
      if ('cssModulesSuffix' in option) {
        cssModulesSuffix = option.cssModulesSuffix;
      }
    });

    return {
      // import styles from './Component.module.css'
      ImportDeclaration(node) {
        if (
          !node.source.value.endsWith(cssModulesSuffix) ||
          node.specifiers.length === 0 ||
          node.specifiers[0].type !== 'ImportDefaultSpecifier'
        ) {
          return;
        }

        importSpecifiers.add(node.specifiers[0].local.name);
      },

      // styles['a' + 'b']
      MemberExpression(node) {
        if (
          node.object.type !== 'Identifier' ||
          !importSpecifiers.has(node.object.name)
        ) {
          return;
        }

        // ✅ styles['a']
        // ✅ styles.a
        if (
          node.property.type === 'Literal' ||
          node.property.type === 'Identifier'
        ) {
          return;
        }

        context.report({
          node,
          message,
        });
      },

      // fn(styles)
      CallExpression(node) {
        node.arguments.forEach(checkExpression);
      },

      // const cls = styles
      VariableDeclarator(node) {
        if (!node.init) {
          return;
        }

        checkExpression(node.init);
      },

      // const arr = [styles]
      ArrayExpression(node) {
        node.elements.forEach(checkExpression);
      },

      // { cls: styles }
      Property(node) {
        checkExpression(node.value);
      },
    };
  },
};
