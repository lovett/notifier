;;; Directory Local Variables
;;; For more information see (info "(emacs) Directory Variables")

((nil
  (eval . (progn
            (set (make-local-variable 'project-root)
                 (file-name-directory
                  (let ((d (dir-locals-find-file ".")))
                    (if (stringp d) d (car d)))))
            (customize-set-variable 'flycheck-javascript-eslint-executable (expand-file-name "node_modules/.bin/eslint" project-root))
            (add-to-list 'flycheck-disabled-checkers 'javascript-jshint)
            (add-to-list 'flycheck-disabled-checkers 'javascript-gjslint)
            (add-to-list 'flycheck-disabled-checkers 'javascript-jscs)
            (add-to-list 'flycheck-disabled-checkers 'javascript-standard)))))
