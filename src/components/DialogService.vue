<script>
//export default {
//  CustomAlert(message, title = 'Alert') {
//    return new Promise((resolve) => {
//      const loaderOptions = window.sfcLoaderOptions;
//      
//      window.loadSfcModule('./src/components/Alert.vue', loaderOptions)
//        .then((AlertComponent) => {
//          const mountNode = document.createElement('div');
//          document.body.appendChild(mountNode);
//
//          const app = window.Vue.createApp(AlertComponent, {
//            message,
//            title,
//            onConfirm: () => {
//              app.unmount();
//              mountNode.remove();
//              resolve();
//            }
//          });
//          app.mount(mountNode);
//        });
//    });
//  },
//
//  CustomPrompt(message, placeholder = '', title = 'Prompt') {
//    return new Promise((resolve) => {
//      const loaderOptions = window.sfcLoaderOptions;
//
//      window.loadSfcModule('./src/components/Prompt.vue', loaderOptions)
//        .then((PromptComponent) => {
//          const mountNode = document.createElement('div');
//          document.body.appendChild(mountNode);
//
//          const app = window.Vue.createApp(PromptComponent, {
//            message,
//            placeholder,
//            title,
//            onConfirm: (value) => {
//              app.unmount();
//              mountNode.remove();
//              resolve(value);
//            },
//            onCancel: () => {
//              app.unmount();
//              mountNode.remove();
//              resolve(null);
//            }
//          });
//          app.mount(mountNode);
//        });
//    });
//  }
//};
//--------------------------------------------------------------------------------
//// 1. Core Dialog Mounting Engine
//const createDialog = async (componentPath, props) => {
//  let component;
//  
//  // Environment Check: Browser SFC Loader vs Native Vite ESM
//  if (window.loadSfcModule) {
//    component = await window.loadSfcModule(componentPath, window.sfcLoaderOptions);
//  } else {
//    // Vite dynamic imports map
//    if (componentPath.includes('Alert.vue')) {
//      component = (await import('./Alert.vue')).default;
//    } else if (componentPath.includes('Prompt.vue')) {
//      component = (await import('./Prompt.vue')).default;
//    }
//  }
//  
//  // Resolve Vue core instance safely across both build layers
//  const VueInstance = window.Vue || (await import('vue'));
//  
//  const mountNode = document.createElement('div');
//  document.body.appendChild(mountNode);
//
//  const app = VueInstance.createApp(component, {
//    ...props,
//    onClose: (outputData = null) => {
//      app.unmount();
//      mountNode.remove();
//      if (props.onResolve) props.onResolve(outputData);
//    }
//  });
//
//  app.mount(mountNode);
//};
//
//// 2. Declare Dialog Orchestrations
//export const CustomAlert = (message, title = 'Alert') => {
//  return new Promise((resolve) => {
//    createDialog('./src/components/Alert.vue', {
//      message,
//      title,
//      onConfirm: () => resolve(),
//      onResolve: resolve
//    });
//  });
//};
//
//export const CustomPrompt = (message, placeholder = '', title = 'Prompt') => {
//  return new Promise((resolve) => {
//    createDialog('./src/components/Prompt.vue', {
//      message,
//      placeholder,
//      title,
//      onConfirm: (value) => resolve(value),
//      onCancel: () => resolve(null),
//      onResolve: resolve
//    });
//  });
//};
//
//// 3. DUAL-EXPORT FIX: 
//// Vite uses the named exports above.
//// vue3-sfc-loader ignores the named exports above and grabs this default block instead.
//export default {
//  CustomAlert,
//  CustomPrompt
//};
//--------------------------------------------------------------------------------
const createDialog = async (componentPath, props) => {
  let component;
  
  if (window.loadSfcModule) {
    component = await window.loadSfcModule(componentPath, window.sfcLoaderOptions);
  } else {
    if (componentPath.includes('Alert.vue')) {
      component = (await import('./Alert.vue')).default;
    } else if (componentPath.includes('Prompt.vue')) {
      component = (await import('./Prompt.vue')).default;
    }
  }
  
  const VueInstance = window.Vue || (await import('vue'));
  
  const mountNode = document.createElement('div');
  document.body.appendChild(mountNode);

  // Define a unified clean tear-down function
  const destroy = () => {
    app.unmount();
    mountNode.remove();
  };

  const app = VueInstance.createApp(component, {
    ...props,
    // Intercept confirmation hooks to clean up the DOM
    onConfirm: (value) => {
      destroy();
      if (props.onConfirm) props.onConfirm(value);
    },
    // Intercept cancel hooks to clean up the DOM
    onCancel: () => {
      destroy();
      if (props.onCancel) props.onCancel();
    }
  });

  app.mount(mountNode);
};

export const CustomAlert = (message, title = 'Alert') => {
  return new Promise((resolve) => {
    createDialog('./src/components/Alert.vue', {
      message,
      title,
      onConfirm: () => resolve()
    });
  });
};

export const CustomPrompt = (message, placeholder = '', title = 'Prompt') => {
  return new Promise((resolve) => {
    createDialog('./src/components/Prompt.vue', {
      message,
      placeholder,
      title,
      onConfirm: (value) => resolve(value),
      onCancel: () => resolve(null)
    });
  });
};

export default {
  CustomAlert,
  CustomPrompt
};
</script>

