JAVAC = javac
JAVA = java
SRC = $(wildcard *.java)
CLASS_DIR = classes
MAIN_CLASS = game.Main

.PHONY: all compile run clean

all: compile run

compile:
	@mkdir -p $(CLASS_DIR)
	$(JAVAC) -d $(CLASS_DIR) $(SRC)

run:
	$(JAVA) -cp $(CLASS_DIR) $(MAIN_CLASS)

clean:
	@rm -rf $(CLASS_DIR)
