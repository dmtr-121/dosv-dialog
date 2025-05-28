import React, { useEffect, useState } from 'react';
import { Languages, X } from 'lucide-react';
import { isMobileDevice } from '../../utils/deviceDetection';

const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));
const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isChrome = /chrome|crios/i.test(navigator.userAgent);
const isMobile = isMobileDevice();

const LanguageGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [animationText, setAnimationText] = useState('');

  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (!browserLang.startsWith('en')) {
      setIsOpen(true);
    }
  }, []);

  const getStepInstructions = () => {
    if (isMobile) {
      if (isIOS && isSafari) {
        return [
          'Вийдіть з браузера та відкрийте "Налаштування" телефону',
          'Прокрутіть вниз та знайдіть Safari або Chrome',
          'Оберіть "Мова"',
          'Додайте English (UK) '
        ];
      } else if (isIOS && isChrome) {
        return [
          'Натисніть на три крапки (⋮) у верхньому правому куті',
          'Оберіть "Налаштування"',
          'Знайдіть розділ "Мови"',
          'Додайте English (UK) або English (US)'
        ];
      } else if (isAndroid && isChrome) {
        return [
          'Натисніть на три крапки (⋮) у верхньому правому куті',
          'Оберіть "Налаштування" або "Settings"',
          'Натисніть "Мови" або "Languages"',
          'Додайте English (UK) та перемістіть вгору списку'
        ];
      }
    } else {
      if (isChrome) {
        return [
          'Натисніть на три крапки (⋮) та оберіть "Налаштування"',
          'Знайдіть розділ "Мови" у боковому меню зліва',
          'Натисніть "Додати мови" та оберіть English (UK)',
          'Перемістіть English (UK) на початок списку'
        ];
      } else if (isSafari) {
        return [
          'Відкрийте меню Safari та оберіть "Параметри"',
          'Перейдіть до вкладки "Веб-сайти"',
          'Знайдіть "Мова" у боковій панелі',
          'Додайте English (UK) та перемістіть вгору'
        ];
      }
    }
    return [];
  };

  const instructions = getStepInstructions();

  useEffect(() => {
    setAnimationText(instructions[step] || '');
  }, [step, instructions]);

  const handleDismiss = () => setIsOpen(false);

  const getDeviceInstructions = () => {
    if (isMobile) {
      if (isIOS && isSafari) return "iOS";
      if (isIOS && isChrome) return "iOS Chrome";
      if (isAndroid && isChrome) return "Android Chrome";
    } else {
      if (isChrome) return "Chrome";
      if (isSafari) return "Safari";
    }
    return "браузера";
  };

  const StepIndicator = ({ currentStep, totalSteps }) => (
    <div className="flex justify-center gap-1 my-2">
      {[...Array(totalSteps)].map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === currentStep ? 'w-4 bg-indigo-600' : 'w-2 bg-gray-300'
          }`}
        />
      ))}
    </div>
  );



  if (!isOpen) return null;

  const totalSteps = instructions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-white rounded-t-xl sm:rounded-xl shadow-2xl 
                    animate-slideUp sm:animate-fadeIn max-h-[85vh] overflow-y-auto
                    ring-4 ring-indigo-500/50 ring-offset-2">
        <div className="sticky top-0 bg-white px-4 py-3 border-b border-gray-300">
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 p-2 text-gray-500 hover:text-indigo-700 rounded-full 
                     transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-full animate-pulse">
              <Languages className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-indigo-900">
                  Зміна мови {getDeviceInstructions()}
                </h2>
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 rounded-full">
                  Важливо
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Покрокова інструкція для коректної роботи застосунку
              </p>
            </div>
          </div>
          <div className="mt-2 p-2 bg-indigo-50 rounded-lg text-sm text-indigo-700">
            Для правильної роботи голосового асистента необхідно змінити мову браузера на англійську
          </div>
        </div>

        <div className="p-6 space-y-3">
          <StepIndicator currentStep={step} totalSteps={totalSteps} />
          
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border-2 border-gray-300">
                <h3 className="font-medium flex items-center gap-2 text-indigo-900">
                  <span>Як змінити мову {getDeviceInstructions()}:</span>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">Крок {step + 1}/{instructions.length}</span>
                </h3>
                <ol className="list-decimal pl-4 space-y-2 mt-3">
                  {instructions.map((text, index) => (
                    <li
                      key={index}
                      className={`transition-all duration-300 ${
                        step === index 
                          ? 'text-indigo-700 font-medium bg-indigo-50 p-2 rounded-lg -mx-2'
                          : 'text-gray-600'
                      }`}
                    >
                      {text}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg 
                       hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300 active:scale-95"
            >
              Назад
            </button>
            <button
              onClick={() => {
                if (step < instructions.length - 1) {
                  setStep(step + 1);
                } else {
                  handleDismiss();
                }
              }}
              className="flex-1 px-3 py-2 text-sm text-white rounded-lg 
                       shadow-md hover:shadow-lg transition-all duration-300
                       bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700
                       hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800
                       active:scale-95"
            >
              {step < totalSteps - 1 ? 'Далі' : 'Зрозуміло'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-2">
            Це вікно з'явиться знову при наступному відкритті сторінки, 
            якщо мова браузера не буде змінена на англійську
          </p>
        </div>
      </div>
    </div>
  );
};

export default LanguageGuide;