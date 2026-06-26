import { createApp } from 'vue';
import AlertComponent from '../components/Alert.vue';
import PromptComponent from '../components/Prompt.vue';

export const CustomAlert = (message, title = 'Alert') => {
  return new Promise((resolve) => {
    const mountNode = document.createElement('div');
    document.body.appendChild(mountNode);

    const app = createApp(AlertComponent, {
      message,
      title,
      onConfirm: () => {
        app.unmount();
        mountNode.remove();
        resolve();
      }
    });

    app.mount(mountNode);
  });
};

export const CustomPrompt = (message, placeholder = '', title = 'Prompt') => {
  return new Promise((resolve) => {
    const mountNode = document.createElement('div');
    document.body.appendChild(mountNode);

    const app = createApp(PromptComponent, {
      message,
      placeholder,
      title,
      onConfirm: (value) => {
        app.unmount();
        mountNode.remove();
        resolve(value); // Returns user text input
      },
      onCancel: () => {
        app.unmount();
        mountNode.remove();
        resolve(null); // Emulates native window.prompt cancel behavior
      }
    });

    app.mount(mountNode);
  });
};

