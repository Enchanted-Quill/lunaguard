import { StyleSheet } from 'react-native';

export const onboardingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B21A8',
  },
  content: {
    flex: 1,
    padding: 32,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#E9D5FF',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  profilePicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePicCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(167, 139, 250, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePicImage: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  permissionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  permissionSubtitle: {
    color: '#E9D5FF',
    fontSize: 14,
    marginBottom: 16,
  },
  permissionButtons: {
    gap: 12,
  },
  permissionButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  permissionButtonActive: {
    backgroundColor: '#10B981',
  },
  permissionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  shortcutsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
  },
  shortcutsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  shortcutsSubtitle: {
    color: '#E9D5FF',
    fontSize: 12,
    marginBottom: 16,
  },
  shortcutsList: {
    gap: 8,
  },
  shortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shortcutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A78BFA',
  },
  shortcutText: {
    color: '#E9D5FF',
    fontSize: 14,
  },
  contactBox: {
    backgroundColor: 'rgba(147, 51, 234, 0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneIcon: {
    flexShrink: 0,
  },
  phoneInput: {
    flex: 1,
  },
  privacyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
  },
  privacyCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'transparent',
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  privacyText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginBottom: 16,
  },
  progressDot: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 32,
    gap: 16,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  nextButtonFlex: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});