import { decodeMojibake } from "./mojibake.js";
import { readString, writeString, LANGUAGE_STORAGE_KEY } from "./storage.js";

export let currentLanguage = 'en';

export const I18N = {
    en: {
        share: 'Share',
        settings: 'Settings',
        rating: 'Rating',
        score: 'Score',
        sub_input_for_points: 'Sub-Input for Points',
        sub_input_for_kills: 'Sub-Input for Kills',
        progression: 'Score Threshold',
        cave: 'Cave',
        edit: 'Edit',
        swords: 'Swords',
        bombs: 'Bombs',
        radar_title: 'Cave Graph',
        radar_strongest: 'Strongest Caves',
        radar_weakest: 'Weakest Caves',
        radar_tab_combined: 'Combined',
        radar_tab_swords: 'Swords',
        radar_tab_bombs: 'Bombs',
        rule_1: 'The benchmark is intended exclusively for <span style="color: #fff;">personal use</span>.',
        rule_2: 'All baddies in the cave must be <span style="color: #fff;">reset to full health</span> before starting.',
        rule_2b: 'Timer starts after entering the cave.',
        rule_3: 'No <span style="color: #fff;">speed boosts</span> from bushes are allowed.',
        rule_4: 'Scoring thresholds must be achieved <span style="color: #fff;">without any assistance</span> from other players or accidental damage caused by other players.',
        rule_5: 'The <span style="color: #fff;">Swords</span> category allows the use of swords only, while the <span style="color: #fff;">Bombs</span> category permits the use of both bombs and swords.',
        share_preview_title: 'Screenshot Preview',
        share_preview_alt: 'Benchmark share preview',
        share_preview_failed: 'Preview failed',
        share_preview_try_again: 'Try Again',
        share_preview_image_load_failed: 'Preview image failed to load.',
        share_preview_generation_failed: 'Screenshot generation failed.',
        share_preview_export_failed: 'Unable to export screenshot.',
        share_preview_timeout: 'Screenshot generation timed out.',
        share_preview_engine_not_ready: 'Screenshot engine not ready.',
        share_preview_capture_failed: 'Screenshot capture failed.',
        share_preview_service_failed: 'Share service request failed.',
        share_preview_service_empty: 'Share service returned an empty image URL.',
        download_image: 'Download Image',
        copy_link: 'Copy Benchmark Link',
        copied: 'Copied',
        guidelines_title: 'Guidelines',
        guidelines_subtitle: 'for accurate scoring',
        settings_title: 'Settings',
        settings_subtitle: 'Customize your benchmark',
        settings_language: 'Language',
        settings_language_note: 'Applies instantly.',
        settings_display: 'Display',
        settings_font_scale: 'Font Size',
        settings_font_family: 'Font',
        settings_compact_mode: 'Compact Mode',
        settings_font_small: 'Small',
        settings_font_normal: 'Normal',
        settings_font_large: 'Large',
        settings_font_default: 'Default',
        settings_font_modern: 'Modern',
        settings_font_classic: 'Classic',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'On',
        settings_toggle_off: 'Off',
        settings_theme: 'Themes',
        settings_theme_note: 'Rank themes unlock as you climb the ranks.',
        settings_theme_auto: 'Auto-apply your current rank theme when you rank up',
        settings_custom_name: 'Custom',
        settings_save_name: 'Save',
        settings_remove_custom: 'Remove',
        settings_custom_create: 'Create',
        settings_custom_locked_note: 'Click Create to unlock custom colors.',
        settings_custom_select_note: 'Select a custom theme.',
        settings_custom_theme: 'Custom Colors',
        settings_custom_note: 'Pick colors to build your own theme.',
        settings_preview: 'Preview',
        settings_preview_title: 'Benchmark Preview',
        settings_preview_note: 'Updates as you change colors.',
        settings_color_target: 'Color Target',
        settings_color_background: 'Background',
        settings_color_accent1: 'Accent 1',
        settings_color_accent2: 'Accent 2',
        settings_color_panel: 'Panel Background',
        settings_color_border: 'Panel Border',
        settings_color_text: 'Text',
        settings_default_config: 'Configuration',
        settings_default_config_startup: 'Configuration Start up',
        settings_visibility_title: 'Visibility',
        settings_visibility_note: 'Choose who can view your benchmark.',
        settings_visibility_label: 'Visibility',
        settings_visibility_everyone: 'Everyone',
        settings_visibility_friends: 'Friends Only',
        edit_hint: 'Right-Click to Edit',
        settings_platform: 'Platform',
        settings_time: 'Time',
        settings_stat: 'Stat',
        settings_save_default: 'Set Default',
        settings_reset_scores: 'Reset Score Values',
        settings_reset_config: 'Configuration',
        settings_current_config: 'Current configuration',
        settings_reset_selected: 'Reset Selected',
        settings_reset_all: 'Reset All Configurations',
        settings_reset_note: 'Does not change defaults.',
        generating_screenshot: 'Generating screenshot...',
        reset_confirm: 'Reset all selected configuration scores?',
        reset_all_confirm: 'Reset all saved configurations scores?',
        settings_pacman: 'Pacman',
        settings_mount: 'Mount',
        mount_speed_1: 'Mount Speed 1',
        mount_speed_2: 'Mount Speed 2',
        footer_site_made_by: 'Site made by',
        footer_disclaimer: 'This site is not affiliated, maintained, endorsed or sponsored by GraalOnline. All assets \u00A9 2026 GraalOnline',
        footer_terms: 'Terms & Conditions',
        footer_privacy: 'Privacy Policy',
        footer_cookie: 'Cookie Policy',
        footer_dmca: 'DMCA Policy',
        menu_profile: 'Profile',
        menu_friends: 'Friends',
        menu_logout: 'Log Out',
        seasonal_add_placements: '+ Add Seasonal Placements',
        seasonal_modal_title: 'Seasonal Placements',
        seasonal_modal_subtitle: 'Add your earned trophies',
        seasonal_current_total: 'Current Total Placements',
        seasonal_total_label: 'Total',
        seasonal_place_1st: '1st Place',
        seasonal_place_2nd: '2nd Place',
        seasonal_place_3rd: '3rd Place',
        seasonal_place_plaque: 'Plaque',
        seasonal_reset_values: 'Reset Values',
        seasonal_save_placements: 'Save Placements',
        achievements_title: 'Achievements',
        highlights_title: 'Highlights',
        add_highlight_btn: '+ Add Highlight',
        profile_settings_title: 'Profile Settings',
        profile_picture: 'Profile Picture',
        upload_image: 'Upload Image',
        replace_image: 'Replace Image',
        edit_image: 'Edit Image',
        remove_image: 'Remove Image',
        username_label: 'Username (1-20 characters)',
        username_placeholder: 'Player',
        guilds_max: 'Guilds (Max 6)',
        add_guild: 'Add Guild',
        guild_name_placeholder: 'Guild Name',
        add: 'Add',
        cancel: 'Cancel',
        save: 'Save',
        confirm: 'Confirm',
        country_flag: 'Country Flag',
        remove_flag: 'Remove Flag',
        account_details: 'Account Details',
        account_id: 'Account ID',
        show: 'Show',
        hide: 'Hide',
        email_address: 'Email Address',
        new_email_placeholder: 'New email address',
        verify_update: 'Verify & Update',
        center: 'Center',
        change_email_address: 'Change Email Address',
        password: 'Password',
        change_password: 'Change Password',
        delete_personal_account: 'Delete Personal Account',
        cannot_undo: 'This cannot be undone.',
        delete_account: 'Delete Account',
        discard_changes: 'Discard Changes',
        save_changes: 'Save Changes',
        friends_title: 'Friends',
        friends_subtitle: 'Add and view your friends benchmarks',
        your_account_id: 'Your Account ID',
        friends_list_tab: 'Friends List',
        friend_requests_tab: 'Friend Requests',
        remove_friends_tab: 'Remove Friends',
        enter_account_id_placeholder: 'Enter Account ID',
        add_friend: 'Add Friend',
        received_friend_requests: 'Received Friend Requests',
        sent_friend_requests: 'Friend Requests Sent',
        select_friends_remove: 'Select friends to remove',
        highlight_modal_title: 'Add Highlight',
        highlight_label_image: 'Image',
        highlight_click_upload: 'Click to upload image',
        highlight_title_required_label: 'Title (Required)',
        highlight_desc_optional_label: 'Description (Optional)',
        highlight_title_placeholder: 'Enter a title...',
        highlight_desc_placeholder: 'Enter a description...',
        highlights_empty: 'No highlights yet.',
        delete: 'Delete',
        highlight_delete_title: 'Delete Highlight',
        highlight_delete_confirm: 'Are you sure you want to delete this highlight?',
        highlight_limit_reached: 'You can only have up to 6 highlights.',
        highlight_title_required_error: 'Title is required.',
        highlight_upload_required_error: 'Please upload an image.',
        highlight_save_failed: 'Failed to save highlight. Please try again.',
        highlight_like_login_required_title: 'Account Required',
        highlight_like_login_required_message: 'You need a signed account to like highlights. Please sign in or create an account.',
        highlight_like_failed_title: 'Like Failed',
        highlight_like_failed_message: 'Could not update this like right now. Please try again.',
        achievement_cat_lifetime: 'Lifetime',
        achievement_cat_kills: 'Kills',
        achievement_cat_points: 'Points',
        achievement_cat_streak: 'Streak',
        achievement_cat_duo: 'Duo',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Quad',
        achievement_cat_challenge: 'Challenge',
        achievement_input_restricted: 'Session Incomplete',
        achievement_enter_friend_name: 'Enter friend name',
        achievement_partner_label: 'Friend 1',
        achievement_friend_label: 'Friend {index}',
        achievement_session_incomplete: 'Session Incomplete',
        achievement_no_image: 'No image',
        achievement_upload_image: 'Upload image',
        achievement_session_image: 'Session Image',
        achievement_completed: 'Completed',
        achievement_incomplete: 'Incomplete',
        achievement_remove_image_title: 'Remove Image',
        achievement_remove_image_confirm: 'Remove this image?',
        achievement_you_have: 'You have unlocked',
        achievement_progress_prefix: '{name}:',
        achievement_goal_total: 'Obtain {value} baddy kills',
        achievement_goal_kills_day: 'Kill {value} baddies in one day',
        achievement_goal_points_day: 'Reach {value} baddy points in one day',
        achievement_goal_streak: 'Get a {value} baddy streak',
        achievement_goal_group_day: 'Complete a {group} session by getting {value} baddy kills in one day',
        achievement_group_duo: 'duo',
        achievement_group_trio: 'trio',
        achievement_group_quad: 'quad',
        friends_none: 'No friends yet.',
        unknown_player: 'Unknown Player',
        friends_error_loading: 'Error loading friends list.',
        friend_requests_none: 'No friend requests.',
        friend_requests_error_loading: 'Error loading friend requests.',
        remove_friends_none: 'No friends to remove.',
        remove_friend_title: 'Remove Friend',
        remove_friend_confirm: 'Remove {name} from your friends list?',
        remove_friend_failed: 'Failed to remove friend.',
        sent_requests_none: 'No sent requests.',
        sent_requests_error_loading: 'Error loading sent requests.',
        accept: 'Accept',
        decline: 'Decline',
        remove: 'Remove',
        add_friend_user_not_found: 'User not found.',
        add_friend_self: 'You cannot add yourself.',
        add_friend_already_friends: 'You are already friends with this account.',
        add_friend_already_sent: 'Friend request already sent.',
        add_friend_check_requests: 'This user already sent you a request. Check Friend Requests.',
        add_friend_sent: 'Friend request sent!',
        add_friend_error: 'Error adding friend. Please try again.',
        profile_email_valid_error: 'Please enter a valid email address.',
        profile_email_different_error: 'Please enter a different email address.',
        profile_email_sending_verification: 'Sending verification...',
        profile_email_verification_sent: 'Verification email sent to {email}. Please check your inbox or spam folder.',
        profile_not_logged_in: 'Not logged in.',
        profile_password_sending_reset: 'Sending password reset email...',
        profile_password_reset_sent: 'Password reset email sent. Please check your inbox or spam folder.',
        profile_email_not_exist: 'Email does not exist.',
        profile_change_password_sending: 'Sending...',
        profile_delete_confirm_title: 'Delete Personal Account',
        profile_delete_confirm_message: 'Are you sure you want to delete your account? This cannot be undone.',
        profile_delete_error_prefix: 'Error deleting account: ',
        profile_save_login_required: 'You must be logged in to save profile changes.',
        profile_saving: 'Saving...',
        profile_save_failed: 'Failed to save profile changes. Please try again.',
        verification_email_sent_to: 'Verification email sent to {email}',
        verification_modal_title: 'Email Verification Required',
        verification_modal_line_1: 'Please verify your email address to continue.',
        verification_modal_line_2: 'Check your inbox for a verification link.',
        verification_modal_resend_btn: 'Resend Verification Email',
        verification_modal_verified_btn: 'I\'ve Verified My Email',
        verification_modal_logout_btn: 'Log Out',
        reauth_password_required: 'Password is required.',
        reauth_verifying: 'Verifying...',
        reauth_confirm: 'Confirm',
        exit_view_mode: 'Exit View Mode',
        views_label: 'Views',
        onboarding_welcome_title: 'Welcome to the Benchmarks!',
        onboarding_welcome_subtitle: 'Please complete your profile setup. A username is required to proceed, while other details are optional and can be updated later in your settings.',
        onboarding_save_continue: 'Save & Continue',
        onboarding_saving: 'Saving...',
        onboarding_username_required: 'Username is required.',
        onboarding_error_prefix: 'Error saving profile: ',
        reauth_title: 'Re-authentication Required',
        reauth_subtitle: 'Please enter your password to continue.',
        reauth_current_password: 'Current Password',
        reauth_failed_prefix: 'Re-authentication failed: ',
        email_update_relogin_title: 'Email Update Requested',
        back_to_login_page: 'Back to Login page',
        achievement_progress_view_prefix: '{name} has unlocked',
        drag_to_reorder: 'Drag to reorder'
    },
    es: {
        share: 'Compartir',
        settings: 'Ajustes',
        settings_title: 'Ajustes',
        settings_subtitle: 'Personaliza tu benchmark',
        rating: 'Clasificación',
        score: 'Puntuación',
        sub_input_for_points: 'Subentrada para puntos',
        sub_input_for_kills: 'Subentrada para bajas',
        progression: 'Umbral de puntuación',
        cave: 'Cueva',
        edit: 'Editar',
        edit_hint: 'Clic derecho para editar',
        swords: 'Espadas',
        bombs: 'Bombas',
        radar_title: 'Gráfico de Cueva',
        radar_strongest: 'Cuevas más fuertes',
        radar_weakest: 'Cuevas más débiles',
        radar_tab_combined: 'Combinado',
        radar_tab_swords: 'Espadas',
        radar_tab_bombs: 'Bombas',
        rule_1: 'El benchmark está destinado exclusivamente para <span style="color: #fff;">uso personal</span>.',
        rule_2: 'Todos los enemigos en la cueva deben ser <span style="color: #fff;">restablecidos a salud completa</span> antes de comenzar.',
        rule_2b: 'El temporizador comienza después de entrar en la cueva.',
        rule_3: 'No se permiten <span style="color: #fff;">aumentos de velocidad</span> de los arbustos.',
        rule_4: 'Los umbrales de puntuación deben alcanzarse <span style="color: #fff;">sin ninguna ayuda</span> de otros jugadores o daño accidental causado por otros jugadores.',
        rule_5: 'La categoría <span style="color: #fff;">Espadas</span> permite solo el uso de espadas, mientras que la categoría <span style="color: #fff;">Bombas</span> permite el uso tanto de bombas como de espadas.',
        share_preview_title: 'Vista previa de la captura',
        share_preview_alt: 'Vista previa para compartir del benchmark',
        share_preview_failed: 'Vista previa fallida',
        share_preview_try_again: 'Intentar de nuevo',
        share_preview_image_load_failed: 'No se pudo cargar la imagen de vista previa.',
        share_preview_generation_failed: 'No se pudo generar la captura de pantalla.',
        share_preview_export_failed: 'No se pudo exportar la captura de pantalla.',
        share_preview_timeout: 'La generaci\u00F3n de la captura de pantalla agot\u00F3 el tiempo de espera.',
        share_preview_engine_not_ready: 'El motor de capturas no est\u00E1 listo.',
        share_preview_capture_failed: 'La captura de pantalla fall\u00F3.',
        share_preview_service_failed: 'La solicitud al servicio de compartici\u00F3n fall\u00F3.',
        share_preview_service_empty: 'El servicio de compartici\u00F3n devolvi\u00F3 una URL de imagen vac\u00EDa.',
        guidelines_title: 'Directrices',
        guidelines_subtitle: 'para una puntuación precisa',
        settings_language: 'Idioma',
        settings_language_note: 'Se aplica al instante.',
        settings_display: 'Pantalla',
        settings_mount: 'Montura',
        mount_speed_1: 'Velocidad de montura 1',
        mount_speed_2: 'Velocidad de montura 2',
        settings_font_scale: 'Tamaño de fuente',
        settings_font_family: 'Fuente',
        settings_compact_mode: 'Modo compacto',
        settings_pacman: 'Pacman',
        settings_font_small: 'Pequeño',
        settings_font_normal: 'Normal',
        settings_font_large: 'Grande',
        settings_font_default: 'Predeterminado',
        settings_font_modern: 'Moderno',
        settings_font_classic: 'Clásico',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Encendido',
        settings_toggle_off: 'Apagado',
        settings_theme: 'Temas',
        settings_theme_note: 'Los temas de rango se desbloquean a medida que subes de rango.',
        settings_theme_auto: 'Aplicar automáticamente tu tema de rango actual al subir de rango',
        settings_custom_name: 'Personalizado',
        settings_save_name: 'Guardar',
        settings_remove_custom: 'Eliminar',
        settings_custom_create: 'Crear',
        settings_custom_locked_note: 'Haz clic en Crear para desbloquear colores personalizados.',
        settings_custom_select_note: 'Selecciona un tema personalizado.',
        settings_custom_theme: 'Colores personalizados',
        settings_custom_note: 'Elige colores para construir tu propio tema.',
        settings_preview: 'Vista previa',
        settings_preview_title: 'Vista previa del benchmark',
        settings_preview_note: 'Se actualiza a medida que cambias los colores.',
        settings_color_target: 'Objetivo de color',
        settings_color_background: 'Fondo',
        settings_color_accent1: 'Acento 1',
        settings_color_accent2: 'Acento 2',
        settings_color_panel: 'Fondo del panel',
        settings_color_border: 'Borde del panel',
        settings_color_text: 'Texto',
        settings_default_config: 'Configuración',
        settings_default_config_startup: 'Configuración de inicio',
        settings_visibility_title: 'Visibilidad',
        settings_visibility_note: 'Elige quién puede ver tu benchmark.',
        settings_visibility_label: 'Visibilidad',
        settings_visibility_everyone: 'Todos',
        settings_visibility_friends: 'Solo amigos',
        settings_platform: 'Plataforma',
        settings_time: 'Tiempo',
        settings_stat: 'Estadística',
        settings_save_default: 'Establecer predeterminado',
        settings_reset_scores: 'Restablecer valores de puntuación',
        settings_reset_config: 'Configuración',
        settings_current_config: 'Configuración actual',
        settings_reset_selected: 'Restablecer seleccionados',
        settings_reset_all: 'Restablecer todas las configuraciones',
        settings_reset_note: 'No cambia los valores predeterminados.',
        menu_profile: 'Perfil',
        menu_friends: 'Amigos',
        menu_logout: 'Cerrar sesión',
        achievements_title: 'Logros',
        highlights_title: 'Destacados',
        profile_settings_title: 'Configuración de perfil',
        friends_title: 'Amigos',
                your_account_id: 'Tu ID de cuenta',
        add_highlight_btn: '+ Agregar destacado',
                        select_friends_remove: 'Selecciona amigos para eliminar',
        show: 'Mostrar',
        hide: 'Ocultar',
        seasonal_modal_title: 'Clasificaciones de Temporada',
        seasonal_modal_subtitle: 'Añade tus trofeos ganados',
        seasonal_current_total: 'Total actual de clasificaciones',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Restablecer valores',
        seasonal_save_placements: 'Guardar clasificaciones',
        seasonal_place_1st: '#1 Trofeo',
        seasonal_place_2nd: '#2 Trofeo',
        seasonal_place_3rd: '#3 Trofeo',
        seasonal_place_plaque: 'Placa',
        friends_none: 'Aún no tienes amigos.',
        friend_requests_none: 'No hay solicitudes de amistad.',
        remove_friends_none: 'No hay amigos para eliminar.',
        highlight_modal_title: 'Agregar destacado',
        highlight_label_image: 'Imagen',
        highlight_click_upload: 'Haz clic para subir imagen',
        copy_link: 'Copiar enlace del benchmark',
        download_image: 'Descargar imagen',
        copied: 'Copiado',
        generating_screenshot: 'Generando captura de pantalla...',
        reset_confirm: '¿Restablecer todos los valores de puntuación a 0?',
        reset_all_confirm: '¿Restablecer todas las configuraciones y puntuaciones guardadas?',
        achievement_you_have: 'Has desbloqueado',
        achievement_completed: 'Completado',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Subir imagen',
        achievement_enter_friend_name: 'Nombre del amigo',
        achievement_friend_label: 'Amigo {index}',
        achievement_session_incomplete: 'Sesión incompleta',
        achievement_no_image: 'Sin imagen',
        achievement_remove_image_title: 'Eliminar imagen',
        achievement_remove_image_confirm: '¿Eliminar esta imagen?',
        achievement_session_image: 'Imagen de sesión',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Bajas',
        achievement_cat_points: 'Puntos',
        achievement_cat_streak: 'Racha',
        achievement_cat_duo: 'Dúo',
        achievement_cat_trio: 'Trío',
        achievement_cat_quad: 'Cuarteto',
        achievement_cat_challenge: 'Desafío',
        achievement_goal_total: 'Consigue {value} bajas de baddies',
        achievement_goal_kills_day: 'Elimina {value} baddies en un dia',
        achievement_goal_points_day: 'Alcanza {value} puntos de baddy en un dia',
        achievement_goal_streak: 'Consigue una racha de {value} baddies',
        achievement_goal_group_day: 'Completa una sesion de {group} consiguiendo {value} bajas de baddies en un dia',
        achievement_group_duo: 'duo',
        achievement_group_trio: 'trio',
        achievement_group_quad: 'cuarteto',
        achievement_progress_view_prefix: '{name} ha desbloqueado',
        remove_friend_title: 'Eliminar amigo',
        remove_friend_confirm: '¿Eliminar a {name} de tu lista de amigos?',
        remove_friend_failed: 'No se pudo eliminar al amigo.',
        highlight_delete_title: 'Eliminar destacado',
        highlight_delete_confirm: '¿Seguro que quieres eliminar este destacado?',
        replace_image: 'Reemplazar imagen',
        password: 'Contraseña',
        sent_requests_none: 'No hay solicitudes enviadas.',
        center: 'Centrar',
        save: 'Guardar',
        cancel: 'Cancelar',
        add: 'Agregar',
        remove: 'Eliminar',
        accept: 'Aceptar',
        decline: 'Rechazar',
        drag_to_reorder: 'Arrastra para reordenar',
        profile_email_verification_sent: 'Se envió un correo de verificación a {email}. Revisa tu bandeja de entrada o spam.',
        verification_email_sent_to: 'Correo de verificación enviado a {email}',
        reauth_password_required: 'Se requiere contraseña.',
        reauth_verifying: 'Verificando...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Se requiere reautenticación',
        reauth_subtitle: 'Ingresa tu contraseña para continuar.',
        reauth_current_password: 'Contraseña actual',
        reauth_failed_prefix: 'La reautenticación falló: ',
        email_update_relogin_title: 'Actualización de correo solicitada',
        back_to_login_page: 'Volver a la página de inicio de sesión',
        footer_site_made_by: 'Sitio creado por',
        footer_disclaimer: 'Este sitio no está afiliado, mantenido, respaldado ni patrocinado por GraalOnline. Todos los recursos © 2026 GraalOnline',
        footer_terms: 'Términos y condiciones',
        footer_privacy: 'Política de privacidad',
        footer_cookie: 'Política de cookies',
        footer_dmca: 'Política DMCA',
        views_label: 'Vistas',
        profile_picture: 'Foto de perfil',
        upload_image: 'Subir imagen',
        edit_image: 'Editar imagen',
        remove_image: 'Eliminar imagen',
        username_label: 'Nombre de usuario (1-20 caracteres)',
        username_placeholder: 'Jugador',
        guilds_max: 'Gremios (máx. 6)',
        guild_name_placeholder: 'Nombre del gremio',
        add_guild: 'Agregar gremio',
        country_flag: 'Bandera del país',
        remove_flag: 'Quitar bandera',
        account_details: 'Detalles de la cuenta',
        account_id: 'ID de cuenta',
        email_address: 'Dirección de correo electrónico',
        new_email_placeholder: 'Nueva dirección de correo',
        verify_update: 'Verificar y actualizar',
        change_email_address: 'Cambiar dirección de correo',
        change_password: 'Cambiar contraseña',
        delete_personal_account: 'Eliminar cuenta personal',
        cannot_undo: 'Esto no se puede deshacer.',
        delete_account: 'Eliminar cuenta',
        profile_email_valid_error: 'Ingresa una dirección de correo válida.',
        profile_email_different_error: 'Ingresa una dirección de correo diferente.',
        profile_email_sending_verification: 'Enviando verificación...',
        profile_not_logged_in: 'No has iniciado sesión.',
        profile_password_sending_reset: 'Enviando correo para restablecer contraseña...',
        profile_password_reset_sent: 'Se envió el correo para restablecer la contraseña. Revisa tu bandeja de entrada o spam.',
        profile_email_not_exist: 'El correo no existe.',
        profile_change_password_sending: 'Enviando...',
        profile_delete_confirm_title: 'Eliminar cuenta personal',
        profile_delete_confirm_message: '¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.',
        profile_delete_error_prefix: 'Error al eliminar la cuenta: ',
        profile_save_login_required: 'Debes iniciar sesión para guardar los cambios del perfil.',
        profile_saving: 'Guardando...',
        profile_save_failed: 'No se pudieron guardar los cambios del perfil. Inténtalo de nuevo.',
        verification_modal_title: 'Se requiere verificacion de correo',
        verification_modal_line_1: 'Verifica tu direcci\u00F3n de correo electr\u00F3nico para continuar.',
        verification_modal_line_2: 'Revisa tu bandeja de entrada para el enlace de verificaci\u00F3n.',
        verification_modal_resend_btn: 'Reenviar correo de verificaci\u00F3n',
        verification_modal_verified_btn: 'Ya verifiqu\u00E9 mi correo',
        verification_modal_logout_btn: 'Cerrar sesi\u00F3n',
        onboarding_welcome_title: '¡Bienvenido a Benchmarks!',
        onboarding_welcome_subtitle: 'Completa la configuración de tu perfil. Se requiere un nombre de usuario para continuar; los demás datos son opcionales y puedes actualizarlos más tarde en tus ajustes.',
        onboarding_save_continue: 'Guardar y continuar',
        onboarding_saving: 'Guardando...',
        onboarding_username_required: 'Se requiere nombre de usuario.',
        onboarding_error_prefix: 'Error al guardar el perfil: ',
        exit_view_mode: 'Salir del modo vista'
    },
    'pt-BR': {
        share: 'Compartilhar',
        settings: 'Configurações',
        rating: 'Classificação',
        score: 'Pontuação',
        sub_input_for_points: 'Subentrada para pontos',
        sub_input_for_kills: 'Subentrada para abates',
        progression: 'Limiar de pontuação',
        cave: 'Caverna',
        edit: 'Editar',
        edit_hint: 'Clique com o botão direito para editar',
        swords: 'Espadas',
        bombs: 'Bombas',
        radar_title: 'Gráfico da Caverna',
        radar_strongest: 'Cavernas Mais Fortes',
        radar_weakest: 'Cavernas Mais Fracas',
        radar_tab_combined: 'Combinado',
        radar_tab_swords: 'Espadas',
        radar_tab_bombs: 'Bombas',
        rule_1: 'O benchmark destina-se exclusivamente para <span style="color: #fff;">uso pessoal</span>.',
        rule_2: 'Todos os inimigos na caverna devem ser <span style="color: #fff;">redefinidos para a saúde total</span> antes de começar.',
        rule_2b: 'O cronômetro começa após entrar na caverna.',
        rule_3: 'Não são permitidos <span style="color: #fff;">aumentos de velocidade</span> de arbustos.',
        rule_4: 'Os limites de pontuação devem ser alcançados <span style="color: #fff;">sem qualquer ajuda</span> de outros jogadores ou danos acidentais causados por outros jogadores.',
        rule_5: 'A categoria <span style="color: #fff;">Espadas</span> permite apenas o uso de espadas, enquanto a categoria <span style="color: #fff;">Bombas</span> permite o uso de bombas e espadas.',
        share_preview_title: 'Pr\u00E9via da captura de tela',
        share_preview_alt: 'Pr\u00E9via de compartilhamento do benchmark',
        share_preview_failed: 'Falha na pr\u00E9via',
        share_preview_try_again: 'Tentar novamente',
        share_preview_image_load_failed: 'N\u00E3o foi poss\u00EDvel carregar a imagem da pr\u00E9via.',
        share_preview_generation_failed: 'N\u00E3o foi poss\u00EDvel gerar a captura de tela.',
        share_preview_export_failed: 'N\u00E3o foi poss\u00EDvel exportar a captura de tela.',
        share_preview_timeout: 'A gera\u00E7\u00E3o da captura de tela excedeu o tempo limite.',
        share_preview_engine_not_ready: 'O mecanismo de captura n\u00E3o est\u00E1 pronto.',
        share_preview_capture_failed: 'Falha ao capturar a tela.',
        share_preview_service_failed: 'A solicita\u00E7\u00E3o ao servi\u00E7o de compartilhamento falhou.',
        share_preview_service_empty: 'O servi\u00E7o de compartilhamento retornou uma URL de imagem vazia.',
        download_image: 'Baixar Imagem',
        copy_link: 'Copiar Link do Benchmark',
        copied: 'Copiado',
        guidelines_title: 'Diretrizes',
        guidelines_subtitle: 'para pontuação precisa',
        settings_title: 'Configurações',
        settings_subtitle: 'Personalize seu benchmark',
        settings_language: 'Idioma',
        settings_language_note: 'Aplica-se instantaneamente.',
        settings_display: 'Tela',
        settings_font_scale: 'Tamanho da Fonte',
        settings_font_family: 'Tipo de Letra',
        settings_compact_mode: 'Modo Compacto',
        settings_pacman: 'Pacman',
        settings_font_small: 'Pequeno',
        settings_font_normal: 'Normal',
        settings_font_large: 'Grande',
        settings_font_default: 'Padrão',
        settings_font_modern: 'Moderno',
        settings_font_classic: 'Clássico',
        settings_font_mono: 'Mono',
        settings_toggle_on: 'Ligado',
        settings_toggle_off: 'Desligado',
        settings_theme: 'Temas',
        settings_theme_note: 'Temas de classificação são desbloqueados conforme sobe de nível.',
        settings_theme_auto: 'Aplicar automaticamente seu tema de classificação atual ao subir de nível',
        settings_custom_name: 'Personalizado',
        settings_save_name: 'Salvar',
        settings_remove_custom: 'Remover',
        settings_custom_create: 'Criar',
        settings_custom_locked_note: 'Clique em Criar para desbloquear cores personalizadas.',
        settings_custom_select_note: 'Selecione um tema personalizado.',
        settings_custom_theme: 'Cores Personalizadas',
        settings_custom_note: 'Escolha cores para criar seu próprio tema.',
        settings_preview: 'Pré-visualização',
        settings_preview_title: 'Pré-visualização do Benchmark',
        settings_preview_note: 'Atualiza conforme altera as cores.',
        settings_color_target: 'Alvo de Cor',
        settings_color_background: 'Fundo',
        settings_color_accent1: 'Destaque 1',
        settings_color_accent2: 'Destaque 2',
        settings_color_panel: 'Fundo do Painel',
        settings_color_border: 'Borda do Painel',
        settings_color_text: 'Texto',
        settings_default_config: 'Configuração',
        settings_default_config_startup: 'Configuração Inicial',
        settings_visibility_title: 'Visibilidade',
        settings_visibility_note: 'Escolha quem pode ver seu benchmark.',
        settings_visibility_label: 'Visibilidade',
        settings_visibility_everyone: 'Todos',
        settings_visibility_friends: 'Apenas Amigos/Guilda',
        settings_platform: 'Plataforma',
        settings_time: 'Tempo',
        settings_stat: 'Estatística',
        settings_save_default: 'Definir Padrão',
        settings_reset_scores: 'Redefinir Valores de Pontuação',
        settings_reset_config: 'Configuração',
        settings_current_config: 'Configuração atual',
        settings_reset_selected: 'Redefinir Selecionado',
        settings_reset_all: 'Redefinir Todas as Configurações',
                menu_profile: 'Perfil',
        menu_friends: 'Amigos',
        menu_logout: 'Sair',
        generating_screenshot: 'Gerando captura de tela...',
        reset_confirm: 'Redefinir todos os valores de pontuação para 0?',
        reset_all_confirm: 'Redefinir todas as configurações e pontuações guardadas?',
        settings_mount: 'Montaria',
        mount_speed_1: 'Velocidade da montaria 1',
        mount_speed_2: 'Velocidade da montaria 2',
        achievements_title: 'Conquistas',
        footer_site_made_by: 'Site feito por',
        footer_disclaimer: 'Este site não é afiliado, mantido, apoiado ou patrocinado pela GraalOnline. Todos os recursos © 2026 GraalOnline',
        footer_terms: 'Termos e Condições',
        footer_privacy: 'Política de Privacidade',
        footer_cookie: 'Política de Cookies',
        footer_dmca: 'Política DMCA',
        exit_view_mode: 'Sair do modo de visualização',
        seasonal_modal_title: 'Classificações sazonais',
        seasonal_modal_subtitle: 'Adicione os troféus conquistados',
        seasonal_current_total: 'Total atual de classificações',
        seasonal_total_label: 'Total',
        seasonal_reset_values: 'Redefinir valores',
        seasonal_save_placements: 'Salvar classificações',
        friends_none: 'Ainda não há amigos.',
        friend_requests_none: 'Sem pedidos de amizade.',
        remove_friends_none: 'Sem amigos para remover.',
        highlight_modal_title: 'Adicionar destaque',
        highlight_label_image: 'Imagem',
        highlight_click_upload: 'Clique para carregar uma imagem',
        achievement_completed: 'Concluído',
        achievement_incomplete: 'Incompleto',
        achievement_upload_image: 'Carregar imagem',
        achievement_enter_friend_name: 'Introduza o nome do amigo',
        seasonal_place_1st: '#1 Troféu',
        seasonal_place_2nd: '#2 Troféu',
        seasonal_place_3rd: '#3 Troféu',
        seasonal_place_plaque: 'Placa',
        profile_settings_title: 'Configurações do Perfil',
        profile_picture: 'Foto de perfil',
        upload_image: 'Carregar imagem',
        edit_image: 'Editar imagem',
        remove_image: 'Remover imagem',
        username_label: 'Nome de usuário (1-20 caracteres)',
        username_placeholder: 'Jogador',
        guilds_max: 'Guildas (máx. 6)',
        guild_name_placeholder: 'Nome da guilda',
        add_guild: 'Adicionar guilda',
        country_flag: 'Bandeira do país',
        remove_flag: 'Remover bandeira',
        account_details: 'Detalhes da conta',
        account_id: 'ID da conta',
        show: 'Mostrar',
        hide: 'Ocultar',
        email_address: 'Endereço de e-mail',
        new_email_placeholder: 'Novo endereço de e-mail',
        verify_update: 'Verificar e atualizar',
        change_email_address: 'Alterar endereço de e-mail',
        password: 'Senha',
        change_password: 'Alterar senha',
        delete_personal_account: 'Excluir conta pessoal',
        cannot_undo: 'Isso não pode ser desfeito.',
        delete_account: 'Excluir conta',
        center: 'Centralizar',
        save: 'Salvar',
        cancel: 'Cancelar',
        add: 'Adicionar',
        remove: 'Remover',
        drag_to_reorder: 'Arraste para reordenar',
        replace_image: 'Substituir imagem',
        save_changes: 'Salvar alterações',
        discard_changes: 'Descartar alterações',
        friends_list_tab: 'Lista de Amigos',
                friends_title: 'Amigos',
        friends_subtitle: 'Adicione e veja os benchmarks dos seus amigos',
        your_account_id: 'Seu ID da conta',
        add_friend: 'Adicionar amigo',
        received_friend_requests: 'Solicitações recebidas',
        sent_friend_requests: 'Solicitações enviadas',
                select_friends_remove: 'Selecione amigos para remover',
        friends_error_loading: 'Erro ao carregar amigos.',
        friend_requests_error_loading: 'Erro ao carregar solicitações de amizade.',
        add_friend_user_not_found: 'Usuário não encontrado.',
        add_friend_self: 'Você não pode adicionar a si mesmo.',
        add_friend_already_friends: 'Vocês já são amigos.',
        add_friend_already_sent: 'Solicitação já enviada.',
        add_friend_check_requests: 'Verifique suas solicitações de amizade.',
        add_friend_sent: 'Solicitação de amizade enviada.',
        add_friend_error: 'Não foi possível enviar a solicitação de amizade.',
        accept: 'Aceitar',
        decline: 'Recusar',
        remove_friend_title: 'Remover Amigo',
        remove_friend_confirm: 'Remover {name} da sua lista de amigos?',
        remove_friend_failed: 'Não foi possível remover o amigo.',
        highlights_title: 'Destaques',
        add_highlight_btn: '+ Adicionar destaque',
        highlight_title_required_label: 'Título (obrigatório)',
        highlight_desc_optional_label: 'Descrição (opcional)',
        highlight_title_placeholder: 'Digite um título...',
        highlight_desc_placeholder: 'Digite uma descrição...',
        highlights_empty: 'Ainda não há destaques.',
        delete: 'Excluir',
        highlight_delete_title: 'Remover destaque',
        highlight_delete_confirm: 'Tem certeza de que deseja excluir este destaque?',
        highlight_title_required_error: 'O título é obrigatório.',
        highlight_upload_required_error: 'A imagem é obrigatória.',
        highlight_save_failed: 'Não foi possível salvar o destaque.',
        highlight_limit_reached: 'Você atingiu o limite de destaques.',
        achievement_you_have: 'Você desbloqueou',
        achievement_session_image: 'Imagem da sessão',
        achievement_session_incomplete: 'Sessão incompleta',
        achievement_no_image: 'Sem imagem',
        achievement_remove_image_title: 'Remover imagem',
        achievement_remove_image_confirm: 'Remover esta imagem?',
        achievement_progress_view_prefix: '{name} desbloqueou',
        achievement_cat_lifetime: 'Total',
        achievement_cat_kills: 'Abates',
        achievement_cat_points: 'Pontos',
        achievement_cat_streak: 'Sequência',
        achievement_cat_duo: 'Dupla',
        achievement_cat_trio: 'Trio',
        achievement_cat_quad: 'Esquadrão',
        achievement_cat_challenge: 'Desafio',
        achievement_goal_total: 'Obtenha {value} abates de baddies',
        achievement_goal_kills_day: 'Elimine {value} baddies em um dia',
        achievement_goal_points_day: 'Alcance {value} pontos de baddy em um dia',
        achievement_goal_streak: 'Consiga uma sequencia de {value} baddies',
        achievement_goal_group_day: 'Complete uma sessao de {group} conseguindo {value} abates de baddies em um dia',
        achievement_group_duo: 'dupla',
        achievement_group_trio: 'trio',
        achievement_group_quad: 'esquadrao',
        profile_email_valid_error: 'Digite um endere�o de e-mail v�lido.',
        profile_email_different_error: 'Digite um endereço de e-mail diferente.',
        profile_email_sending_verification: 'Enviando verificação...',
        profile_email_verification_sent: 'E-mail de verificação enviado para {email}. Verifique sua caixa de entrada ou pasta de spam.',
        profile_not_logged_in: 'Você não está conectado.',
        profile_password_sending_reset: 'Enviando e-mail de redefinição de senha...',
        profile_password_reset_sent: 'E-mail de redefinição de senha enviado. Verifique sua caixa de entrada ou pasta de spam.',
        profile_email_not_exist: 'O e-mail não existe.',
        profile_change_password_sending: 'Enviando...',
        profile_delete_confirm_title: 'Excluir conta pessoal',
        profile_delete_confirm_message: 'Tem certeza de que deseja excluir sua conta? Esta ação não pode ser desfeita.',
        profile_delete_error_prefix: 'Erro ao excluir conta: ',
        profile_save_login_required: 'Você precisa estar conectado para salvar as alterações do perfil.',
        profile_saving: 'Salvando...',
        profile_save_failed: 'Não foi possível salvar as alterações do perfil. Tente novamente.',
        verification_modal_title: 'Verifica\u00E7\u00E3o de e-mail necess\u00E1ria',
        verification_modal_line_1: 'Verifique seu endere\u00E7o de e-mail para continuar.',
        verification_modal_line_2: 'Confira sua caixa de entrada para o link de verifica\u00E7\u00E3o.',
        verification_modal_resend_btn: 'Reenviar e-mail de verifica\u00E7\u00E3o',
        verification_modal_verified_btn: 'J\u00E1 verifiquei meu e-mail',
        verification_modal_logout_btn: 'Sair',
        reauth_password_required: 'A senha é obrigatória.',
        reauth_verifying: 'Verificando...',
        reauth_confirm: 'Confirmar',
        reauth_title: 'Reautenticação necessária',
        reauth_subtitle: 'Digite sua senha para continuar.',
        reauth_current_password: 'Senha atual',
        reauth_failed_prefix: 'Falha na reautenticação: ',
        email_update_relogin_title: 'Atualização de e-mail solicitada',
        back_to_login_page: 'Voltar para a página de login',
        onboarding_welcome_title: 'Bem-vindo ao Benchmarks!',
        onboarding_welcome_subtitle: 'Conclua a configuração do seu perfil. Um nome de usuário é obrigatório para continuar, enquanto os outros detalhes são opcionais e podem ser atualizados depois nas configurações.',
        onboarding_save_continue: 'Salvar e continuar',
        onboarding_saving: 'Salvando...',
        onboarding_username_required: 'Nome de usuário é obrigatório.',
        onboarding_error_prefix: 'Erro ao salvar perfil: ',
        views_label: 'Visualizações',
        achievement_friend_label: 'Amigo {index}'
    }
};

// Locale key repairs for benchmark friends/user menu labels.
Object.assign(I18N.es, {
    friends_title: 'Amigos',
    friends_subtitle: 'Agrega y ve los benchmarks de tus amigos',
    your_account_id: 'Tu ID de cuenta',
    add_friend: 'Agregar amigo',
    friend_requests_tab: 'Solicitudes de amistad',
    remove_friends_tab: 'Eliminar amigos',
    select_friends_remove: 'Selecciona amigos para eliminar',
    menu_profile: 'Perfil',
    menu_friends: 'Amigos',
    menu_logout: 'Cerrar sesion'
});

Object.assign(I18N['pt-BR'], {
    settings_reset_note: 'Nao altera os padroes.',
    friends_title: 'Amigos',
    friends_subtitle: 'Adicione e veja os benchmarks dos seus amigos',
    your_account_id: 'Seu ID da conta',
    add_friend: 'Adicionar amigo',
    friend_requests_tab: 'Solicitacoes de amizade',
    remove_friends_tab: 'Remover amigos',
    select_friends_remove: 'Selecione amigos para remover',
    menu_profile: 'Perfil',
    menu_friends: 'Amigos',
    menu_logout: 'Sair'
});
export const SUPPORTED_BENCHMARK_LANGUAGES = ['en', 'es', 'pt-BR'];

export const BENCHMARK_LANGUAGE_LABELS = {
    en: 'English',
    es: 'Espa\u00F1ol',
    'pt-BR': 'Portugu\u00EAs'
};

export function setLanguage(lang) {
    if (I18N[lang]) {
        currentLanguage = lang;
    } else {
        currentLanguage = 'en';
    }
}

export function tForLang(lang, key) {
    const langMap = I18N[lang];
    let candidate = langMap && langMap[key];
    candidate = decodeMojibake(candidate);
    if (typeof candidate === 'string') {
        const hasReplacementGlyph = candidate.includes('Ã¯Â¿Â½');
        const hasRepeatedQuestionMarks = (candidate.match(/\?/g) || []).length >= 2;
        const hasBrokenLatinWord = /[A-Za-z]\?[A-Za-z]/.test(candidate);
        if (hasReplacementGlyph || hasRepeatedQuestionMarks || hasBrokenLatinWord) {
            candidate = null;
        }
        if (key.startsWith('footer_') && candidate && candidate.includes('?')) {
            candidate = null;
        }
    }
    if (candidate) return candidate;
    const fallback = decodeMojibake(I18N.en && I18N.en[key]);
    return fallback || key;
}

export function t(key) {
    return tForLang(currentLanguage, key);
}

export function tf(key, vars = {}) {
    let out = t(key);
    Object.keys(vars).forEach((name) => {
        out = out.replace(new RegExp(`\{${name}\}`, 'g'), String(vars[name]));
    });
    return out;
}

const AUTH_EN = {
    page_login_title: 'Login - Benchmark',
    page_signup_title: 'Sign Up - Benchmark',
    page_forgot_title: 'Reset Password - Benchmark',
    page_verification_title: 'Verification Sent - Benchmark',
    login_heading: 'Login',
    signup_heading: 'Sign Up',
    forgot_heading: 'Reset Password',
    verification_heading: 'Check Your Email',
    label_email: 'Email',
    label_password: 'Password',
    label_confirm_password: 'Confirm Password',
    label_remember_me: 'Remember me',
    btn_login: 'Login',
    btn_signup: 'Sign Up',
    btn_reset_password: 'Reset Password',
    btn_go_to_login: 'Go to Login',
    link_forgot_password: 'Forgot Password?',
    link_sign_up: 'Sign Up',
    text_already_have_account: 'Already have an account?',
    link_login: 'Login',
    link_back_to_login: 'Back to Login',
    verification_message_html: 'We\'ve sent a verification link to your email address.<br>Please check your <strong>spam folder</strong>.',
    footer_site_made_by: 'Site made by',
    footer_disclaimer: 'This site is not affiliated, maintained, endorsed or sponsored by GraalOnline. All assets \u00A9 2026 GraalOnline',
    footer_terms: 'Terms & Conditions',
    footer_privacy: 'Privacy Policy',
    footer_cookie: 'Cookie Policy',
    footer_dmca: 'DMCA Policy',
    err_login_missing: 'Please enter your email address and password.',
    err_login_verify: 'Please verify your email address before logging in.',
    err_login_invalid: 'Invalid email or password.',
    err_signup_fill: 'Please fill in all fields.',
    err_signup_mismatch: 'Passwords do not match.',
    err_signup_verify_send: 'Error sending verification email.',
    err_forgot_missing: 'Please enter your email address.',
    msg_forgot_success: 'Check your email folder to reset password.',
    err_email_in_use: 'This email is already in use.',
    err_weak_password: 'Password is too weak.',
    err_invalid_email: 'Please enter a valid email address.',
    err_user_not_found: 'No account found with this email.',
    err_too_many_requests: 'Too many attempts. Please try again later.',
    err_unknown: 'Something went wrong. Please try again.'
};

export const SUPPORTED_AUTH_LANGUAGES = ['en', 'es', 'pt-BR'];

export const AUTH_LANGUAGE_LABELS = {
    en: 'English',
    es: 'Espa\u00F1ol',
    'pt-BR': 'Portugu\u00EAs'
};

const AUTH_LOCALE_OVERRIDES = {
    es: {
        page_login_title: 'Iniciar sesi\u00F3n - Benchmark',
        page_signup_title: 'Registrarse - Benchmark',
        page_forgot_title: 'Restablecer contrase\u00F1a - Benchmark',
        page_verification_title: 'Verificaci\u00F3n enviada - Benchmark',
        login_heading: 'Iniciar sesi\u00F3n',
        signup_heading: 'Registrarse',
        forgot_heading: 'Restablecer contrase\u00F1a',
        verification_heading: 'Revisa tu correo electr\u00F3nico',
        label_password: 'Contrase\u00F1a',
        label_email: 'Correo electr\u00F3nico',
        label_confirm_password: 'Confirmar contrase\u00F1a',
        label_remember_me: 'Recu\u00E9rdame',
        btn_login: 'Iniciar sesi\u00F3n',
        btn_signup: 'Registrarse',
        btn_reset_password: 'Restablecer contrase\u00F1a',
        btn_go_to_login: 'Ir a iniciar sesi\u00F3n',
        link_forgot_password: '\u00BFOlvidaste tu contrase\u00F1a?',
        link_sign_up: 'Registrarse',
        text_already_have_account: '\u00BFYa tienes una cuenta?',
        link_login: 'Iniciar sesi\u00F3n',
        link_back_to_login: 'Volver a iniciar sesi\u00F3n',
        verification_message_html: 'Hemos enviado un enlace de verificaci\u00F3n a tu correo electr\u00F3nico.<br>Por favor revisa tu <strong>carpeta de spam</strong>.',
        footer_site_made_by: 'Sitio creado por',
        footer_disclaimer: 'Este sitio no est\u00E1 afiliado, mantenido, respaldado ni patrocinado por GraalOnline. Todos los recursos \u00A9 2026 GraalOnline',
        footer_terms: 'T\u00E9rminos y condiciones',
        footer_privacy: 'Pol\u00EDtica de privacidad',
        footer_cookie: 'Pol\u00EDtica de cookies',
        footer_dmca: 'Pol\u00EDtica DMCA',
        err_login_missing: 'Por favor ingresa tu correo electr\u00F3nico y contrase\u00F1a.',
        err_login_verify: 'Verifica tu correo electr\u00F3nico antes de iniciar sesi\u00F3n.',
        err_login_invalid: 'Correo electr\u00F3nico o contrase\u00F1a inv\u00E1lidos.',
        err_signup_fill: 'Por favor completa todos los campos.',
        err_signup_mismatch: 'Las contrase\u00F1as no coinciden.',
        err_signup_verify_send: 'Error al enviar el correo de verificaci\u00F3n.',
        err_forgot_missing: 'Por favor ingresa tu correo electr\u00F3nico.',
        msg_forgot_success: 'Revisa tu correo para restablecer la contrase\u00F1a.',
        err_email_in_use: 'Este correo electr\u00F3nico ya est\u00E1 en uso.',
        err_weak_password: 'La contrase\u00F1a es demasiado d\u00E9bil.',
        err_invalid_email: 'Por favor ingresa una direcci\u00F3n de correo v\u00E1lida.',
        err_user_not_found: 'No se encontr\u00F3 una cuenta con este correo electr\u00F3nico.',
        err_too_many_requests: 'Demasiados intentos. Int\u00E9ntalo de nuevo m\u00E1s tarde.',
        err_unknown: 'Algo sali\u00F3 mal. Int\u00E9ntalo de nuevo.'
    },
    'pt-BR': {
        page_login_title: 'Entrar - Benchmark',
        page_signup_title: 'Criar conta - Benchmark',
        page_forgot_title: 'Redefinir senha - Benchmark',
        page_verification_title: 'Verifica\u00E7\u00E3o enviada - Benchmark',
        login_heading: 'Entrar',
        signup_heading: 'Criar conta',
        forgot_heading: 'Redefinir senha',
        verification_heading: 'Verifique seu e-mail',
        label_password: 'Senha',
        label_confirm_password: 'Confirmar senha',
        label_remember_me: 'Lembrar de mim',
        btn_login: 'Entrar',
        btn_signup: 'Criar conta',
        btn_reset_password: 'Redefinir senha',
        btn_go_to_login: 'Ir para login',
        link_forgot_password: 'Esqueceu a senha?',
        link_sign_up: 'Criar conta',
        text_already_have_account: 'J\u00E1 tem uma conta?',
        link_login: 'Entrar',
        link_back_to_login: 'Voltar para login',
        verification_message_html: 'Enviamos um link de verifica\u00E7\u00E3o para seu e-mail.<br>Verifique tamb\u00E9m sua <strong>pasta de spam</strong>.',
        footer_site_made_by: 'Site feito por',
        footer_disclaimer: 'Este site n\u00E3o \u00E9 afiliado, mantido, endossado ou patrocinado pela GraalOnline. Todos os ativos \u00A9 2026 GraalOnline',
        footer_terms: 'Termos e Condi\u00E7\u00F5es',
        footer_privacy: 'Pol\u00EDtica de Privacidade',
        footer_cookie: 'Pol\u00EDtica de Cookies',
        footer_dmca: 'Pol\u00EDtica DMCA',
        err_login_missing: 'Introduza o seu e-mail e palavra-passe.',
        err_login_verify: 'Verifique o seu e-mail antes de iniciar sess\u00E3o.',
        err_login_invalid: 'E-mail ou palavra-passe inv\u00E1lidos.',
        err_signup_fill: 'Preencha todos os campos.',
        err_signup_mismatch: 'As palavras-passe n\u00E3o coincidem.',
        err_signup_verify_send: 'Erro ao enviar e-mail de verifica\u00E7\u00E3o.',
        err_forgot_missing: 'Introduza o seu endere\u00E7o de e-mail.',
        msg_forgot_success: 'Verifique o seu e-mail para repor a palavra-passe.',
        err_email_in_use: 'Este e-mail j\u00E1 est\u00E1 em uso.',
        err_weak_password: 'A palavra-passe \u00E9 demasiado fraca.',
        err_invalid_email: 'Introduza um endere\u00E7o de e-mail v\u00E1lido.',
        err_user_not_found: 'N\u00E3o foi encontrada nenhuma conta com este e-mail.',
        err_too_many_requests: 'Demasiadas tentativas. Tente novamente mais tarde.',
        err_unknown: 'Ocorreu um erro. Tente novamente.'
    }
};

export const AUTH_I18N = { en: AUTH_EN };
Object.keys(AUTH_LOCALE_OVERRIDES).forEach((lang) => {
    AUTH_I18N[lang] = { ...AUTH_EN, ...AUTH_LOCALE_OVERRIDES[lang] };
});

Object.keys(AUTH_LANGUAGE_LABELS).forEach((lang) => {
    AUTH_LANGUAGE_LABELS[lang] = decodeMojibake(AUTH_LANGUAGE_LABELS[lang]);
});
Object.keys(AUTH_I18N).forEach((lang) => {
    const dict = AUTH_I18N[lang];
    Object.keys(dict).forEach((key) => {
        dict[key] = decodeMojibake(dict[key]);
    });
});
Object.keys(AUTH_I18N).forEach((lang) => {
    if (!SUPPORTED_AUTH_LANGUAGES.includes(lang)) {
        delete AUTH_I18N[lang];
    }
});
Object.keys(AUTH_LANGUAGE_LABELS).forEach((lang) => {
    if (!SUPPORTED_AUTH_LANGUAGES.includes(lang)) {
        delete AUTH_LANGUAGE_LABELS[lang];
    }
});

function readStoredBenchmarkLanguage() {
    return readString(LANGUAGE_STORAGE_KEY, '');
}

function writeStoredBenchmarkLanguage(lang) {
    writeString(LANGUAGE_STORAGE_KEY, lang);
}

export function getCurrentAuthLanguage() {
    const select = document.getElementById('authLanguageSelect');
    const candidate = (select && select.value) || readStoredBenchmarkLanguage() || 'en';
    return AUTH_I18N[candidate] ? candidate : 'en';
}

export function authT(key, lang) {
    const useLang = AUTH_I18N[lang] ? lang : getCurrentAuthLanguage();
    let value = AUTH_I18N[useLang] && AUTH_I18N[useLang][key];
    if (typeof value === 'string' && key.startsWith('footer_') && value.includes('?')) {
        value = '';
    }
    return value || AUTH_EN[key] || '';
}

export function applyAuthTranslations(pageKey) {
    const lang = getCurrentAuthLanguage();
    const select = document.getElementById('authLanguageSelect');

    if (select) {
        const storedLang = readStoredBenchmarkLanguage();
        const safeLang = AUTH_I18N[storedLang] ? storedLang : 'en';
        if (storedLang !== safeLang) {
            writeStoredBenchmarkLanguage(safeLang);
        }

        select.innerHTML = '';
        SUPPORTED_AUTH_LANGUAGES.forEach((langKey) => {
            const option = document.createElement('option');
            option.value = langKey;
            option.textContent = AUTH_LANGUAGE_LABELS[langKey] || langKey;
            select.appendChild(option);
        });
        select.value = lang;
    }

    document.documentElement.lang = lang;

    const titleKey = `page_${pageKey}_title`;
    const title = authT(titleKey, lang);
    if (title) {
        document.title = title;
    }

    document.querySelectorAll('[data-auth-i18n]').forEach((el) => {
        const key = el.getAttribute('data-auth-i18n');
        el.textContent = authT(key, lang);
    });

    document.querySelectorAll('[data-auth-i18n-html]').forEach((el) => {
        const key = el.getAttribute('data-auth-i18n-html');
        el.innerHTML = authT(key, lang);
    });

    return lang;
}

export function resolveAuthError(error) {
    if (!error || !error.code) return authT('err_unknown');

    switch (error.code) {
        case 'auth/email-already-in-use':
            return authT('err_email_in_use');
        case 'auth/weak-password':
            return authT('err_weak_password');
        case 'auth/invalid-email':
            return authT('err_invalid_email');
        case 'auth/user-not-found':
            return authT('err_user_not_found');
        case 'auth/too-many-requests':
            return authT('err_too_many_requests');
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
            return authT('err_login_invalid');
        default:
            return authT('err_unknown');
    }
}

export function setupAuthLangDropdown(selectEl) {
    const dropdown = document.getElementById('authLangDropdown');
    const button = document.getElementById('authLangButton');
    const menu = document.getElementById('authLangMenu');
    if (!selectEl || !dropdown || !button || !menu) return;

    const syncLabel = () => {
        const selected = selectEl.options[selectEl.selectedIndex];
        button.textContent = selected ? selected.textContent : 'Language';
    };

    const setOpen = (isOpen) => {
        dropdown.classList.toggle('open', isOpen);
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    if (dropdown.dataset.authLangDropdownBound !== '1') {
        button.addEventListener('click', () => {
            setOpen(!dropdown.classList.contains('open'));
        });
        document.addEventListener('click', (event) => {
            if (!dropdown.contains(event.target)) {
                setOpen(false);
            }
        });
        selectEl.addEventListener('change', syncLabel);
        dropdown.dataset.authLangDropdownBound = '1';
    }

    menu.innerHTML = '';
    Array.from(selectEl.options).forEach((opt) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'auth-lang-option';
        optionBtn.textContent = opt.textContent;
        optionBtn.dataset.value = opt.value;
        optionBtn.addEventListener('click', () => {
            selectEl.value = opt.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            setOpen(false);
        });
        menu.appendChild(optionBtn);
    });

    syncLabel();
}

export function initAuthLanguage(pageKey) {
    const select = document.getElementById('authLanguageSelect');
    const savedLang = readStoredBenchmarkLanguage() || 'en';

    if (select) {
        select.value = AUTH_I18N[savedLang] ? savedLang : 'en';
        applyAuthTranslations(pageKey);
        setupAuthLangDropdown(select);

        if (select.dataset.authLangBound !== '1') {
            select.addEventListener('change', function onAuthLanguageChange() {
                writeStoredBenchmarkLanguage(this.value);
                applyAuthTranslations(pageKey);
                setupAuthLangDropdown(select);
            });
            select.dataset.authLangBound = '1';
        }
    } else {
        applyAuthTranslations(pageKey);
    }
}





// Locale key fixes for friends modal translations.
Object.assign(I18N.es, {
    friends_subtitle: 'Agrega y ve los benchmarks de tus amigos',
    enter_account_id_placeholder: 'Introduce tu ID de cuenta',
    your_account_id: 'Tu ID de cuenta',
    friends_list_tab: 'Lista de Amigos',
    received_friend_requests: 'Solicitudes recibidas',
    sent_friend_requests: 'Solicitudes enviadas',
    friend_requests_tab: 'Solicitudes de amistad',
    remove_friends_tab: 'Eliminar amigos',
    select_friends_remove: 'Selecciona amigos para eliminar',
    add_friend: 'Agregar amigo'
});

Object.assign(I18N['pt-BR'], {
    friends_subtitle: 'Adicione e veja os benchmarks dos seus amigos',
    enter_account_id_placeholder: 'Digite seu ID da conta',
    your_account_id: 'Seu ID da conta',
    friends_list_tab: 'Lista de Amigos',
    received_friend_requests: 'Solicitações recebidas',
    sent_friend_requests: 'Solicitações enviadas',
    friend_requests_tab: 'Solicitações de amizade',
    remove_friends_tab: 'Remover amigos',
    select_friends_remove: 'Selecione amigos para remover',
    add_friend: 'Adicionar amigo'
});

// Friend request empty/error states: force translations for both supported locales.
Object.assign(I18N.es, {
    sent_requests_none: 'No hay solicitudes enviadas.',
    sent_requests_error_loading: 'Error al cargar las solicitudes enviadas.'
});

Object.assign(I18N['pt-BR'], {
    sent_requests_none: 'Sem solicita\u00E7\u00F5es enviadas.',
    sent_requests_error_loading: 'Erro ao carregar solicita\u00E7\u00F5es enviadas.'
});

Object.assign(I18N.en, {
    settings_default_config_startup_note: 'Automatically applies configurations after login'
});

Object.assign(I18N.es, {
    settings_default_config_startup_note: 'Aplica autom\u00E1ticamente las configuraciones despu\u00E9s de iniciar sesi\u00F3n'
});

Object.assign(I18N['pt-BR'], {
    settings_default_config_startup_note: 'Aplica automaticamente as configura\u00E7\u00F5es ap\u00F3s o login'
});
